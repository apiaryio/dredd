const async = require('async');
const parse = require('dredd-transactions/parse');
const compile = require('dredd-transactions/compile');

const configureReporters = require('./configureReporters');
const handleRuntimeProblems = require('./handleRuntimeProblems');
const resolveLocations = require('./resolveLocations');
const readLocation = require('./readLocation');
const resolveModule = require('./resolveModule');
const logger = require('./logger');
const TransactionRunner = require('./TransactionRunner');
const { applyConfiguration } = require('./configuration');


function prefixErrors(decoratedCallback, prefix) {
  return (error, ...args) => {
    if (error) { error.message = `${prefix}: ${error.message}`; }
    decoratedCallback(error, ...args);
  };
}


function readLocations(locations, options, callback) {
  if (typeof options === 'function') { [options, callback] = [{}, options]; }

  async.map(locations, (location, next) => {
    const decoratedNext = prefixErrors(next, `Unable to load API description document from '${location}'`);
    readLocation(location, options, decoratedNext);
  }, (error, contents) => {
    if (error) { callback(error); return; }

    const apiDescriptions = locations
      .map((location, i) => ({ location, content: contents[i] }));
    callback(null, apiDescriptions);
  });
}


function parseContent(apiDescriptions, callback) {
  async.map(apiDescriptions, ({ location, content }, next) => {
    const decoratedNext = prefixErrors(next, `Unable to parse API description document '${location}'`);
    parse(content, decoratedNext);
  }, (error, parseResults) => {
    if (error) { callback(error); return; }

    const parsedAPIdescriptions = apiDescriptions
      .map((apiDescription, i) => Object.assign({}, parseResults[i], apiDescription));
    callback(null, parsedAPIdescriptions);
  });
}


function compileTransactions(apiDescriptions) {
  return apiDescriptions
    .map(({ mediaType, apiElements, location }) => {
      try {
        return compile(mediaType, apiElements, location);
      } catch (error) {
        error.message = (
          'Unable to compile HTTP transactions from '
          + `API description document '${location}': ${error.message}`
        );
        throw error;
      }
    })
    .map((compileResult, i) => Object.assign({}, compileResult, apiDescriptions[i]));
}


function toTransactions(apiDescriptions) {
  return apiDescriptions
    // produce an array of transactions for each API description,
    // where each transaction object gets an extra 'apiDescription'
    // property with details about the API description it comes from
    .map(apiDescription => (
      apiDescription.transactions
        .map(transaction => Object.assign({
          apiDescription: {
            location: apiDescription.location,
            mediaType: apiDescription.mediaType,
          },
        }, transaction))
    ))
    // flatten array of arrays
    .reduce((flatArray, array) => flatArray.concat(array), []);
}


class Dredd {
  constructor(config) {
    this.configuration = applyConfiguration(config);
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
    this.transactionRunner = new TransactionRunner(this.configuration);
    this.logger = logger;
  }

  prepareAPIdescriptions(callback) {
    this.logger.debug('Resolving locations of API description documents');
    let locations;
    try {
      locations = resolveLocations(this.configuration.custom.cwd, this.configuration.options.path);
    } catch (error) {
      process.nextTick(() => callback(error));
      return;
    }

    async.waterfall([
      (next) => {
        this.logger.debug('Reading API description documents');
        readLocations(locations, { http: this.configuration.options.http }, next);
      },
      (apiDescriptions, next) => {
        const allAPIdescriptions = this.configuration.apiDescriptions.concat(apiDescriptions);
        this.logger.debug('Parsing API description documents');
        parseContent(allAPIdescriptions, next);
      },
    ], (error, apiDescriptions) => {
      if (error) { callback(error); return; }

      this.logger.debug('Compiling HTTP transactions from API description documents');
      let apiDescriptionsWithTransactions;
      try {
        apiDescriptionsWithTransactions = compileTransactions(apiDescriptions);
      } catch (compileErr) {
        callback(compileErr);
        return;
      }

      callback(null, apiDescriptionsWithTransactions);
    });
  }

  run(callback) {
    this.logger.debug('Resolving --require');
    if (this.configuration.options.require) {
      const requirePath = resolveModule(this.configuration.custom.cwd, this.configuration.options.require);
      try {
        require(requirePath); // eslint-disable-line global-require, import/no-dynamic-require
      } catch (error) {
        callback(error, this.stats);
        return;
      }
    }

    this.logger.debug('Configuring reporters');
    configureReporters(this.configuration, this.stats, this.transactionRunner);

    this.logger.debug('Preparing API description documents');
    this.prepareAPIdescriptions((error, apiDescriptions) => {
      if (error) { callback(error, this.stats); return; }
      this.configuration.apiDescriptions = apiDescriptions;

      // TODO https://github.com/apiaryio/dredd/issues/1191
      const annotationsError = handleRuntimeProblems(apiDescriptions, this.logger);
      if (annotationsError) { callback(annotationsError, this.stats); return; }

      this.logger.debug('Starting the transaction runner');
      this.transactionRunner.config(this.configuration);
      const transactions = toTransactions(apiDescriptions);
      this.transactionRunner.run(transactions, (runError) => {
        callback(runError, this.stats);
      });
    });
  }
}


module.exports = Dredd;
