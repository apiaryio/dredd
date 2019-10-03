import async from 'async';
import parse from 'dredd-transactions/parse';
import compile from 'dredd-transactions/compile';

import configureReporters from './configureReporters';
import resolveLocations from './resolveLocations';
import readLocation from './readLocation';
import resolveModule from './resolveModule';
import logger from './logger';
import TransactionRunner from './TransactionRunner';
import { applyConfiguration } from './configuration';
import annotationToLoggerInfo from './annotationToLoggerInfo';

function prefixError(error, prefix) {
  error.message = `${prefix}: ${error.message}`;
  return error;
}

function prefixErrors(decoratedCallback, prefix) {
  return (error, ...args) => {
    if (error) {
      prefixError(error, prefix);
    }
    decoratedCallback(error, ...args);
  };
}

function readLocations(locations, options, callback) {
  const usesOptions = typeof options !== 'function';
  const resolvedOptions = usesOptions ? options : {};
  const resolvedCallback = usesOptions ? callback : options;

  async.map(
    locations,
    (location, next) => {
      const decoratedNext = prefixErrors(
        next,
        `Unable to load API description document from '${location}'`,
      );
      readLocation(location, resolvedOptions, decoratedNext);
    },
    (error, contents) => {
      if (error) {
        resolvedCallback(error);
        return;
      }

      const apiDescriptions = locations.map((location, i) => ({
        location,
        content: contents[i],
      }));
      resolvedCallback(null, apiDescriptions);
    },
  );
}

function parseContent(apiDescriptions, callback) {
  async.map(
    apiDescriptions,
    ({ location, content }, next) => {
      const decoratedNext = prefixErrors(
        next,
        `Unable to parse API description document '${location}'`,
      );
      parse(content, decoratedNext);
    },
    (error, parseResults) => {
      if (error) {
        callback(error);
        return;
      }

      const parsedAPIdescriptions = apiDescriptions.map((apiDescription, i) =>
        Object.assign({}, parseResults[i], apiDescription),
      );
      callback(null, parsedAPIdescriptions);
    },
  );
}

function compileTransactions(apiDescriptions) {
  return apiDescriptions
    .map(({ mediaType, apiElements, location }) => {
      try {
        return compile(mediaType, apiElements, location);
      } catch (error) {
        throw prefixError(
          error,
          'Unable to compile HTTP transactions from ' +
            `API description document '${location}': ${error.message}`,
        );
      }
    })
    .map((compileResult, i) =>
      Object.assign({}, compileResult, apiDescriptions[i]),
    );
}

function toTransactions(apiDescriptions) {
  return (
    apiDescriptions
      // produce an array of transactions for each API description,
      // where each transaction object gets an extra 'apiDescription'
      // property with details about the API description it comes from
      .map((apiDescription) =>
        apiDescription.transactions.map((transaction) =>
          Object.assign(
            {
              apiDescription: {
                location: apiDescription.location,
                mediaType: apiDescription.mediaType,
              },
            },
            transaction,
          ),
        ),
      )
      // flatten array of arrays
      .reduce((flatArray, array) => flatArray.concat(array), [])
  );
}

function toLoggerInfos(apiDescriptions) {
  return apiDescriptions
    .map((apiDescription) =>
      apiDescription.annotations.map((annotation) =>
        annotationToLoggerInfo(apiDescription.location, annotation),
      ),
    )
    .reduce(
      (flatAnnotations, annotations) => flatAnnotations.concat(annotations),
      [],
    );
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
      locations = resolveLocations(
        this.configuration.custom.cwd,
        this.configuration.path,
      );
    } catch (error) {
      process.nextTick(() => callback(error));
      return;
    }

    async.waterfall(
      [
        (next) => {
          this.logger.debug('Reading API description documents');
          readLocations(locations, { http: this.configuration.http }, next);
        },
        (apiDescriptions, next) => {
          const allAPIdescriptions = this.configuration.apiDescriptions.concat(
            apiDescriptions,
          );
          this.logger.debug('Parsing API description documents');
          parseContent(allAPIdescriptions, next);
        },
      ],
      (error, apiDescriptions) => {
        if (error) {
          callback(error);
          return;
        }

        this.logger.debug(
          'Compiling HTTP transactions from API description documents',
        );
        let apiDescriptionsWithTransactions;
        try {
          apiDescriptionsWithTransactions = compileTransactions(
            apiDescriptions,
          );
        } catch (compileErr) {
          callback(compileErr);
          return;
        }

        callback(null, apiDescriptionsWithTransactions);
      },
    );
  }

  run(callback) {
    this.logger.debug('Resolving --require');
    if (this.configuration.require) {
      const requirePath = resolveModule(
        this.configuration.custom.cwd,
        this.configuration.require,
      );
      try {
        require(requirePath); // eslint-disable-line global-require, import/no-dynamic-require
      } catch (error) {
        callback(error, this.stats);
        return;
      }
    }

    this.logger.debug('Configuring reporters');
    configureReporters(this.configuration, this.stats, this.transactionRunner);
    // FIXME: 'configureReporters()' pollutes the 'stats' object with
    // this property. Which is unfortunate, as the 'stats' object is
    // a part of Dredd's public interface. This line cleans it up for now, but
    // ideally the property wouldn't be needed at all.
    delete this.stats.fileBasedReporters;

    this.logger.debug('Preparing API description documents');
    this.prepareAPIdescriptions((error, apiDescriptions) => {
      if (error) {
        callback(error, this.stats);
        return;
      }

      const loggerInfos = toLoggerInfos(apiDescriptions);
      // FIXME: Winston 3.x supports calling .log() directly with the loggerInfo
      // object as it's sole argument, but that's not the case with Winston 2.x
      // Once we upgrade Winston, the line below can be simplified to .log(loggerInfo)
      //
      // Watch https://github.com/apiaryio/dredd/issues/1225 for updates
      loggerInfos.forEach(({ level, message }) =>
        this.logger.log(level, message),
      );
      if (loggerInfos.find((loggerInfo) => loggerInfo.level === 'error')) {
        callback(new Error('API description processing error'), this.stats);
        return;
      }

      this.logger.debug('Starting the transaction runner');
      this.configuration.apiDescriptions = apiDescriptions;
      this.transactionRunner.config(this.configuration);
      const transactions = toTransactions(apiDescriptions);
      this.transactionRunner.run(transactions, (runError) => {
        callback(runError, this.stats);
      });
    });
  }
}

export default Dredd;
