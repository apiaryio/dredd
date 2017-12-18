// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
const glob = require('glob');
const fs = require('fs');
const clone = require('clone');
const async = require('async');
const request = require('request');
const url = require('url');

const logger = require('./logger');
let options = require('./options');
const Runner = require('./transaction-runner');
const {applyConfiguration} = require('./configuration');
const handleRuntimeProblems = require('./handle-runtime-problems');
const dreddTransactions = require('dredd-transactions');
const configureReporters = require('./configure-reporters');


const PROXY_ENV_VARIABLES = ['HTTP_PROXY', 'HTTPS_PROXY', 'NO_PROXY'];
const FILE_DOWNLOAD_TIMEOUT = 5000;


const removeDuplicates = arr =>
  arr.reduce(function(alreadyProcessed, currentItem) {
    if (alreadyProcessed.indexOf(currentItem) === -1) {
      return alreadyProcessed.concat(currentItem);
    }
    return alreadyProcessed;
  }
  , [])
;

class Dredd {
  constructor(config) {
    this.init(config);
  }

  // this is here only because there there is no way how to spy a constructor in CoffeScript
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
      duration: 0
    };
    this.transactions = [];
    this.runner = new Runner(this.configuration);
    configureReporters(this.configuration, this.stats, this.tests, this.runner);
    return this.logProxySettings();
  }

  logProxySettings() {
    const proxySettings = [];
    for (let envVariableName of Object.keys(process.env || {})) {
      var needle;
      const envVariableValue = process.env[envVariableName];
      if ((needle = envVariableName.toUpperCase(), !Array.from(PROXY_ENV_VARIABLES).includes(needle))) { continue; }
      if (envVariableValue === '') { continue; }
      proxySettings.push(`${envVariableName}=${envVariableValue}`);
    }

    if (proxySettings.length) {
      const message = `\
HTTP(S) proxy specified by environment variables: \
${proxySettings.join(', ')}. Please read documentation on how \
Dredd works with proxies: \
https://dredd.readthedocs.io/en/latest/how-it-works/#using-https-proxy\
`;
      return logger.verbose(message);
    }
  }

  run(callback) {
    this.configDataIsEmpty = true;

    if (this.configuration.files == null) { this.configuration.files = []; }
    if (this.configuration.data == null) { this.configuration.data = {}; }

    const passedConfigData = {};

    const object = this.configuration.data || {};
    for (let key of Object.keys(object || {})) {
      const val = object[key];
      this.configDataIsEmpty = false;
      if (typeof val === 'string') {
        passedConfigData[key] = {
          filename: key,
          raw: val
        };
      } else if ((typeof val === 'object') && val.raw && val.filename) {
        passedConfigData[val.filename] = {
          filename: val.filename,
          raw: val.raw
        };
      }
    }

    if (!this.configDataIsEmpty) {
      this.configuration.data = passedConfigData;
    }

    // remove duplicate paths
    this.configuration.options.path = removeDuplicates(this.configuration.options.path);

    // spin that merry-go-round
    logger.verbose('Expanding glob patterns.');
    return this.expandGlobs(globsErr => {
      if (globsErr) { return callback(globsErr, this.stats); }

      logger.verbose('Reading API description files.');
      return this.loadFiles(loadErr => {
        if (loadErr) { return callback(loadErr, this.stats); }

        logger.verbose('Parsing API description files and compiling a list of HTTP transactions to test.');
        return this.compileTransactions(compileErr => {
          if (compileErr) { return callback(compileErr, this.stats); }

          logger.verbose('Starting reporters and waiting until all of them are ready.');
          return this.emitStart(emitStartErr => {
            if (emitStartErr) { return callback(emitStartErr, this.stats); }

            logger.verbose('Starting transaction runner.');
            return this.startRunner(runnerErr => {
              if (runnerErr) { return callback(runnerErr, this.stats); }

              logger.verbose('Wrapping up testing.');
              return this.transactionsComplete(callback);
            });
          });
        });
      });
    });
  }

  // expand all globs
  expandGlobs(callback) {
    return async.each(this.configuration.options.path, (globToExpand, globCallback) => {
      if (/^http(s)?:\/\//.test(globToExpand)) {
        this.configuration.files = this.configuration.files.concat(globToExpand);
        return globCallback();
      }

      return glob(globToExpand, (err, match) => {
        if (err) { return globCallback(err); }
        this.configuration.files = this.configuration.files.concat(match);
        return globCallback();
      });
    }

    , err => {
      if (err) { return callback(err, this.stats); }

      if (this.configDataIsEmpty && (this.configuration.files.length === 0)) {
        err = new Error(`\
API description document (or documents) not found on path: \
'${this.configuration.options.path}'\
`);
        return callback(err, this.stats);
      }

      // remove duplicate filenames
      this.configuration.files = removeDuplicates(this.configuration.files);
      return callback(null, this.stats);
    });
  }

  // load all files
  loadFiles(callback) {
    // 6 parallel connections is a standard limit when connecting to one hostname,
    // use the same limit of parallel connections for reading/downloading files
    return async.eachLimit(this.configuration.files, 6, (fileUrlOrPath, loadCallback) => {
      const {protocol, host} = url.parse(fileUrlOrPath);
      if (host && ['http:', 'https:'].includes(protocol)) {
        logger.verbose('Downloading remote file:', fileUrlOrPath);
        return this.downloadFile(fileUrlOrPath, loadCallback);
      } else {
        return this.readLocalFile(fileUrlOrPath, loadCallback);
      }
    }
    , callback);
  }

  downloadFile(fileUrl, callback) {
    options = clone(this.configuration.http);
    options.url = fileUrl;
    options.timeout = FILE_DOWNLOAD_TIMEOUT;

    return request.get(options, (downloadError, res, body) => {
      let err;
      if (downloadError) {
        logger.debug(`Downloading ${fileUrl} errored:`, `${downloadError}` || downloadError.code);
        err = new Error(`\
Error when loading file from URL '${fileUrl}'. \
Is the provided URL correct?\
`);
        return callback(err, this.stats);
      }
      if (!body || (res.statusCode < 200) || (res.statusCode >= 300)) {
        err = new Error(`\
Unable to load file from URL '${fileUrl}'. \
Server did not send any blueprint back and responded with status code ${res.statusCode}.\
`);
        return callback(err, this.stats);
      }
      this.configuration.data[fileUrl] = {raw: body, filename: fileUrl};
      return callback(null, this.stats);
    });
  }

  readLocalFile(filePath, callback) {
    return fs.readFile(filePath, 'utf8', (readError, data) => {
      if (readError) {
        const err = new Error(`\
Error when reading file '${filePath}' (${readError.message}). \
Is the provided path correct?\
`);
        return callback(err);
      }
      this.configuration.data[filePath] = {raw: data, filename: filePath};
      return callback(null, this.stats);
    });
  }

  // compile transcations from asts
  compileTransactions(callback) {
    this.transactions = [];

    // compile HTTP transactions for each API description
    return async.each(Object.keys(this.configuration.data), (filename, next) => {
      const fileData = this.configuration.data[filename];
      if (fileData.annotations == null) { fileData.annotations = []; }

      logger.verbose('Compiling HTTP transactions from API description file:', filename);
      return dreddTransactions.compile(fileData.raw, filename, (compilationError, compilationResult) => {
        if (compilationError) { return next(compilationError); }

        fileData.mediaType = compilationResult.mediaType;
        fileData.annotations = fileData.annotations.concat(compilationResult.annotations);
        this.transactions = this.transactions.concat(compilationResult.transactions);
        return next();
      });
    }
    , runtimeError => {
      if (runtimeError == null) { runtimeError = handleRuntimeProblems(this.configuration.data); }
      return callback(runtimeError, this.stats);
    });
  }

  // start the runner
  emitStart(callback) {
    // more than one reporter is supported
    let reporterCount = this.configuration.emitter.listeners('start').length;

    // when event 'start' is emitted, function in callback is executed for each
    // reporter registered by listeners
    return this.configuration.emitter.emit('start', this.configuration.data, reporterError => {
      if (reporterError) { logger.error(reporterError.message); }

      // last called reporter callback function starts the runner
      reporterCount--;
      if (reporterCount === 0) {
        return callback(null, this.stats);
      }
    });
  }

  startRunner(callback) {
    // run all transactions
    this.runner.config(this.configuration);
    return this.runner.run(this.transactions, callback);
  }

  transactionsComplete(callback) {
    let reporterCount = this.configuration.emitter.listeners('end').length;
    return this.configuration.emitter.emit('end', () => {
      reporterCount--;
      if (reporterCount === 0) {
        return callback(null, this.stats);
      }
    });
  }
}

module.exports = Dredd;
module.exports.options = options;
