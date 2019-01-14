const async = require('async');
const clone = require('clone');
const glob = require('glob');
const fs = require('fs');
const path = require('path');
const request = require('request');
const url = require('url');

const dreddTransactions = require('dredd-transactions');
const configureReporters = require('./configureReporters');
const handleRuntimeProblems = require('./handleRuntimeProblems');
const logger = require('./logger');
const Runner = require('./TransactionRunner');
const { applyConfiguration } = require('./configuration');

const options = require('./options.json');

const PROXY_ENV_VARIABLES = ['HTTP_PROXY', 'HTTPS_PROXY', 'NO_PROXY'];
const FILE_DOWNLOAD_TIMEOUT = 5000;

function removeDuplicates(arr) {
  return arr.reduce((alreadyProcessed, currentItem) => {
    if (alreadyProcessed.indexOf(currentItem) === -1) {
      return alreadyProcessed.concat(currentItem);
    }
    return alreadyProcessed;
  }, []);
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
    this.transactions = [];
    this.runner = new Runner(this.configuration);
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
      logger.verbose(message);
    }
  }

  run(callback) {
    this.configDataIsEmpty = true;

    if (!this.configuration.files) { this.configuration.files = []; }
    if (!this.configuration.data) { this.configuration.data = {}; }

    const passedConfigData = {};

    const object = this.configuration.data || {};
    for (const key of Object.keys(object || {})) {
      const val = object[key];
      this.configDataIsEmpty = false;
      if (typeof val === 'string') {
        passedConfigData[key] = {
          filename: key,
          raw: val,
        };
      } else if (typeof val === 'object' && val.raw && val.filename) {
        passedConfigData[val.filename] = {
          filename: val.filename,
          raw: val.raw,
        };
      }
    }

    if (!this.configDataIsEmpty) {
      this.configuration.data = passedConfigData;
    }

    // Remove duplicate paths
    this.configuration.options.path = removeDuplicates(this.configuration.options.path);

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
        logger.error(`Error requiring module '${mod}':`, err.message);
        callback(err, this.stats);
        return;
      }
    }

    // Spin that merry-go-round
    logger.verbose('Expanding glob patterns.');
    this.expandGlobs((globsErr) => {
      if (globsErr) { return callback(globsErr, this.stats); }

      logger.verbose('Reading API description files.');
      this.loadFiles((loadErr) => {
        if (loadErr) { return callback(loadErr, this.stats); }

        logger.verbose('Parsing API description files and compiling a list of HTTP transactions to test.');
        this.compileTransactions((compileErr) => {
          if (compileErr) { return callback(compileErr, this.stats); }

          logger.verbose('Starting reporters and waiting until all of them are ready.');
          this.emitStart((emitStartErr) => {
            if (emitStartErr) { return callback(emitStartErr, this.stats); }

            logger.verbose('Starting transaction runner.');
            this.startRunner((runnerErr) => {
              if (runnerErr) { return callback(runnerErr, this.stats); }

              logger.verbose('Wrapping up testing.');
              this.transactionsComplete(callback);
            });
          });
        });
      });
    });
  }

  // Expand all globs
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

      if (this.configDataIsEmpty && this.configuration.files.length === 0) {
        err = new Error(`
API description document (or documents) not found on path:
'${this.configuration.options.path}'
`);
        return callback(err, this.stats);
      }

      // Remove duplicate filenames
      this.configuration.files = removeDuplicates(this.configuration.files);
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
        logger.verbose('Downloading remote file:', fileUrlOrPath);
        this.downloadFile(fileUrlOrPath, loadCallback);
      } else {
        this.readLocalFile(fileUrlOrPath, loadCallback);
      }
    },
    callback);
  }

  downloadFile(fileUrl, callback) {
    const opts = clone(this.configuration.http);
    opts.url = fileUrl;
    opts.timeout = FILE_DOWNLOAD_TIMEOUT;

    request.get(opts, (downloadError, res, body) => {
      let err;
      if (downloadError) {
        logger.debug(`Downloading ${fileUrl} errored:`, `${downloadError}` || downloadError.code);
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
      this.configuration.data[fileUrl] = { raw: body, filename: fileUrl };
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
      this.configuration.data[filePath] = { raw: data, filename: filePath };
      callback(null, this.stats);
    });
  }

  // Compile transactions from ASTs
  compileTransactions(callback) {
    this.transactions = [];

    // Compile HTTP transactions for each API description
    async.each(Object.keys(this.configuration.data), (filename, next) => {
      const fileData = this.configuration.data[filename];
      if (!fileData.annotations) { fileData.annotations = []; }

      logger.verbose('Compiling HTTP transactions from API description file:', filename);
      dreddTransactions.compile(fileData.raw, filename, (compilationError, compilationResult) => {
        if (compilationError) { return next(compilationError); }

        fileData.mediaType = compilationResult.mediaType;
        fileData.annotations = fileData.annotations.concat(compilationResult.annotations);
        this.transactions = this.transactions.concat(compilationResult.transactions);
        next();
      });
    },
    (runtimeError) => {
      if (!runtimeError) { runtimeError = handleRuntimeProblems(this.configuration.data); }
      callback(runtimeError, this.stats);
    });
  }

  // Start the runner
  emitStart(callback) {
    // More than one reporter is supported
    let reporterCount = this.configuration.emitter.listeners('start').length;

    // When event 'start' is emitted, function in callback is executed for each
    // reporter registered by listeners
    this.configuration.emitter.emit('start', this.configuration.data, (reporterError) => {
      if (reporterError) { logger.error(reporterError.message); }

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
