const async = require('async');
const clone = require('clone');
const glob = require('glob');
const fs = require('fs');
const path = require('path');
const request = require('request');
const url = require('url');
const parse = require('dredd-transactions/parse');
const compile = require('dredd-transactions/compile');

const configureReporters = require('./configureReporters');
const handleRuntimeProblems = require('./handleRuntimeProblems');
const logger = require('./logger');
const Runner = require('./TransactionRunner');
const { applyConfiguration } = require('./configuration');
const options = require('./options.json');


const PROXY_ENV_VARIABLES = ['HTTP_PROXY', 'HTTPS_PROXY', 'NO_PROXY'];
const FILE_DOWNLOAD_TIMEOUT = 5000;


function unique(array) {
  return Array.from(new Set(array));
}


class Dredd {
  constructor(config) {
    this.init(config);
  }

  // This is here only because there there is no way how to spy a constructor in CoffeScript
  init(config) {
    this.configuration = applyConfiguration(config);
    this.configuration.http = {};
    this.tests = [];
    this.stats = {
      tests: 0,
      failures: 0,
      errors: 0,
      passes: 0,
      skipped: 0,
      start: 0,
      end: 0,
      duration: 0,
    };
    this.configuration.files = [];
    this.transactions = [];
    this.runner = new Runner(this.configuration);
    this.logger = logger;
    configureReporters(this.configuration, this.stats, this.tests, this.runner);
    this.logProxySettings();
  }

  logProxySettings() {
    const proxySettings = [];
    for (const envVariableName of Object.keys(process.env || {})) {
      const envVariableValue = process.env[envVariableName];
      if (!Array.from(PROXY_ENV_VARIABLES).includes(envVariableName.toUpperCase())) { continue; }
      if (envVariableValue === '') { continue; }
      proxySettings.push(`${envVariableName}=${envVariableValue}`);
    }

    if (proxySettings.length) {
      const message = `
HTTP(S) proxy specified by environment variables: \
${proxySettings.join(', ')}. Please read documentation on how
Dredd works with proxies:
https://dredd.org/en/latest/how-it-works/#using-https-proxy
`;
      this.logger.debug(message);
    }
  }

  run(callback) {
    // Take care of --require
    if (this.configuration.options.require) {
      let mod = this.configuration.options.require;
      const abs = fs.existsSync(mod) || fs.existsSync(`${mod}.js`);
      if (abs) {
        mod = path.resolve(mod);
      }
      try {
        // eslint-disable-next-line global-require, import/no-dynamic-require
        require(mod);
      } catch (err) {
        this.logger.error(`Error requiring module '${mod}':`, err.message);
        callback(err, this.stats);
        return;
      }
    }

    // Spin that merry-go-round
    this.logger.debug('Expanding glob patterns.');
    this.expandGlobs((globsErr) => {
      if (globsErr) { return callback(globsErr, this.stats); }

      this.logger.debug('Reading API description files.');
      this.loadFiles((loadErr) => {
        if (loadErr) { return callback(loadErr, this.stats); }

        this.logger.debug('Parsing API description files and compiling a list of HTTP transactions to test.');
        this.compileTransactions((compileErr) => {
          if (compileErr) { return callback(compileErr, this.stats); }

          this.logger.debug('Starting reporters and waiting until all of them are ready.');
          this.emitStart((emitStartErr) => {
            if (emitStartErr) { return callback(emitStartErr, this.stats); }

            this.logger.debug('Starting transaction runner.');
            this.startRunner((runnerErr) => {
              if (runnerErr) { return callback(runnerErr, this.stats); }

              this.logger.debug('Wrapping up testing.');
              this.transactionsComplete(callback);
            });
          });
        });
      });
    });
  }

  // Expand all globs
  // TODO use the same mechanism as in 'resolveHookfiles', this is unnecessary,
  // duplicate work
  expandGlobs(callback) {
    async.each(this.configuration.options.path, (globToExpand, globCallback) => {
      if (/^http(s)?:\/\//.test(globToExpand)) {
        this.configuration.files = this.configuration.files.concat(globToExpand);
        return globCallback();
      }

      glob(globToExpand, (err, match) => {
        if (err) { return globCallback(err); }
        this.configuration.files = this.configuration.files.concat(match);
        if (match.length === 0) {
          err = new Error(`
            API description document(s) not found on path:
            '${globToExpand}'
         `);
          return globCallback(err);
        }
        globCallback();
      });
    },
    (err) => {
      if (err) { return callback(err, this.stats); }

      if (this.configuration.apiDescriptions.length === 0 && this.configuration.files.length === 0) {
        err = new Error(`
API description document (or documents) not found on path:
'${this.configuration.options.path}'
`);
        return callback(err, this.stats);
      }

      // Remove duplicate filenames
      this.configuration.files = unique(this.configuration.files);
      callback(null, this.stats);
    });
  }

  // Load all files
  loadFiles(callback) {
    // 6 parallel connections is a standard limit when connecting to one hostname,
    // use the same limit of parallel connections for reading/downloading files
    async.eachLimit(this.configuration.files, 6, (fileUrlOrPath, loadCallback) => {
      const { protocol, host } = url.parse(fileUrlOrPath);
      if (host && ['http:', 'https:'].includes(protocol)) {
        this.logger.debug('Downloading remote file:', fileUrlOrPath);
        this.downloadFile(fileUrlOrPath, loadCallback);
      } else {
        this.readLocalFile(fileUrlOrPath, loadCallback);
      }
    }, callback);
  }

  downloadFile(fileUrl, callback) {
    const opts = clone(this.configuration.http);
    opts.url = fileUrl;
    opts.timeout = FILE_DOWNLOAD_TIMEOUT;

    request.get(opts, (downloadError, res, body) => {
      let err;
      if (downloadError) {
        this.logger.debug(`Downloading ${fileUrl} errored:`, `${downloadError}` || downloadError.code);
        err = new Error(`
Error when loading file from URL '${fileUrl}'.
Is the provided URL correct?
`);
        return callback(err, this.stats);
      }
      if (!body || (res.statusCode < 200) || (res.statusCode >= 300)) {
        err = new Error(`
Unable to load file from URL '${fileUrl}'.
Server did not send any blueprint back and responded with status code ${res.statusCode}.
`);
        return callback(err, this.stats);
      }
      this.configuration.apiDescriptions.push({
        location: fileUrl,
        content: body,
      });
      callback(null, this.stats);
    });
  }

  readLocalFile(filePath, callback) {
    fs.readFile(filePath, 'utf8', (readError, data) => {
      if (readError) {
        const err = new Error(`
Error when reading file '${filePath}' (${readError.message}).
Is the provided path correct?
`);
        return callback(err);
      }
      this.configuration.apiDescriptions.push({
        location: filePath,
        content: data,
      });
      callback(null, this.stats);
    });
  }

  // Compile transactions from ASTs
  compileTransactions(callback) {
    this.transactions = [];

    // Compile HTTP transactions for each API description
    async.each(this.configuration.apiDescriptions, (apiDescription, next) => {
      apiDescription.annotations = [];

      this.logger.debug(`Parsing API description: ${apiDescription.location}`);
      parse(apiDescription.content, (parseErr, parseResult) => {
        if (parseErr) { next(parseErr); return; }

        this.logger.debug(`Compiling HTTP transactions from API description: ${apiDescription.location}`);
        let compileResult;
        try {
          compileResult = compile(parseResult.mediaType, parseResult.apiElements, apiDescription.location);
        } catch (compileErr) {
          next(compileErr);
          return;
        }
        apiDescription.mediaType = compileResult.mediaType;
        apiDescription.annotations = apiDescription.annotations.concat(compileResult.annotations);
        this.transactions = this.transactions
          .concat(compileResult.transactions)
          .map(transaction => (Object.assign({ apiDescriptionMediaType: compileResult.mediaType }, transaction)));
        next();
      });
    },
    (runtimeError) => {
      if (!runtimeError) { runtimeError = handleRuntimeProblems(this.configuration.apiDescriptions, this.logger); }
      callback(runtimeError, this.stats);
    });
  }

  // Start the runner
  emitStart(callback) {
    // More than one reporter is supported
    let reporterCount = this.configuration.emitter.listeners('start').length;

    // When event 'start' is emitted, function in callback is executed for each
    // reporter registered by listeners
    this.configuration.emitter.emit('start', this.configuration.apiDescriptions, (reporterError) => {
      if (reporterError) { this.logger.error(reporterError.message); }

      // Last called reporter callback function starts the runner
      reporterCount--;
      if (reporterCount === 0) {
        callback(null, this.stats);
      }
    });
  }

  startRunner(callback) {
    // Run all transactions
    this.runner.config(this.configuration);
    this.runner.run(this.transactions, callback);
  }

  transactionsComplete(callback) {
    let reporterCount = this.configuration.emitter.listeners('end').length;
    this.configuration.emitter.emit('end', () => {
      reporterCount--;
      if (reporterCount === 0) {
        callback(null, this.stats);
      }
    });
  }
}

module.exports = Dredd;
module.exports.options = options;
