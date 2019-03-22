const async = require('async');
const chai = require('chai');
const clone = require('clone');
const gavel = require('gavel');
const os = require('os');
const url = require('url');

const addHooks = require('./addHooks');
const logger = require('./logger');
const reporterOutputLogger = require('./reporters/reporterOutputLogger');
const packageData = require('../package.json');
const sortTransactions = require('./sortTransactions');
const performRequest = require('./performRequest');


function headersArrayToObject(arr) {
  return Array.from(arr).reduce((result, currentItem) => {
    result[currentItem.name] = currentItem.value;
    return result;
  }, {});
}

function eventCallback(reporterError) {
  if (reporterError) { logger.error(reporterError.message); }
}


class TransactionRunner {
  constructor(configuration) {
    this.configureTransaction = this.configureTransaction.bind(this);
    this.executeTransaction = this.executeTransaction.bind(this);
    this.configuration = configuration;
    this.logs = [];
    this.hookStash = {};
    this.error = null;
    this.hookHandlerError = null;
  }

  config(config) {
    this.configuration = config;
    this.multiBlueprint = this.configuration.apiDescriptions.length > 1;
  }

  run(transactions, callback) {
    logger.debug('Starting reporters and waiting until all of them are ready');
    this.emitStart((emitStartErr) => {
      if (emitStartErr) { return callback(emitStartErr); }

      logger.debug('Sorting HTTP transactions');
      transactions = this.configuration.options.sorted ? sortTransactions(transactions) : transactions;

      logger.debug('Configuring HTTP transactions');
      transactions = transactions.map(this.configureTransaction.bind(this));

      logger.debug('Reading hook files and registering hooks');
      addHooks(this, transactions, (addHooksError) => {
        if (addHooksError) { return callback(addHooksError); }

        logger.debug('Executing HTTP transactions');
        this.executeAllTransactions(transactions, this.hooks, (execAllTransErr) => {
          if (execAllTransErr) { return callback(execAllTransErr); }

          logger.debug('Wrapping up testing and waiting until all reporters are done');
          this.emitEnd(callback);
        });
      });
    });
  }

  emitStart(callback) {
    // More than one reporter is supported
    let reporterCount = this.configuration.emitter.listeners('start').length;

    // When event 'start' is emitted, function in callback is executed for each
    // reporter registered by listeners
    this.configuration.emitter.emit('start', this.configuration.apiDescriptions, (reporterError) => {
      if (reporterError) { logger.error(reporterError.message); }

      // Last called reporter callback function starts the runner
      reporterCount--;
      if (reporterCount === 0) { callback(); }
    });
  }

  executeAllTransactions(transactions, hooks, callback) {
    // Warning: Following lines is "differently" performed by 'addHooks'
    // in TransactionRunner.run call. Because addHooks creates hooks.transactions
    // as an object `{}` with transaction.name keys and value is every
    // transaction, we do not fill transactions from executeAllTransactions here.
    // Transactions is supposed to be an Array here!
    let transaction;
    if (!hooks.transactions) {
      hooks.transactions = {};
      for (transaction of transactions) {
        hooks.transactions[transaction.name] = transaction;
      }
    }
    // End of warning

    if (this.hookHandlerError) { return callback(this.hookHandlerError); }

    logger.debug('Running \'beforeAll\' hooks');

    this.runHooksForData(hooks.beforeAllHooks, transactions, () => {
      if (this.hookHandlerError) { return callback(this.hookHandlerError); }

      // Iterate over transactions' transaction
      // Because async changes the way referencing of properties work,
      // we need to work with indexes (keys) here, no other way of access.
      return async.timesSeries(transactions.length, (transactionIndex, iterationCallback) => {
        transaction = transactions[transactionIndex];
        logger.debug(`Processing transaction #${transactionIndex + 1}:`, transaction.name);

        logger.debug('Running \'beforeEach\' hooks');
        this.runHooksForData(hooks.beforeEachHooks, transaction, () => {
          if (this.hookHandlerError) { return iterationCallback(this.hookHandlerError); }

          logger.debug('Running \'before\' hooks');
          this.runHooksForData(hooks.beforeHooks[transaction.name], transaction, () => {
            if (this.hookHandlerError) { return iterationCallback(this.hookHandlerError); }

            // This method:
            // - skips and fails based on hooks or options
            // - executes a request
            // - recieves a response
            // - runs beforeEachValidation hooks
            // - runs beforeValidation hooks
            // - runs Gavel validation
            this.executeTransaction(transaction, hooks, () => {
              if (this.hookHandlerError) { return iterationCallback(this.hookHandlerError); }

              logger.debug('Running \'afterEach\' hooks');
              this.runHooksForData(hooks.afterEachHooks, transaction, () => {
                if (this.hookHandlerError) { return iterationCallback(this.hookHandlerError); }

                logger.debug('Running \'after\' hooks');
                this.runHooksForData(hooks.afterHooks[transaction.name], transaction, () => {
                  if (this.hookHandlerError) { return iterationCallback(this.hookHandlerError); }

                  logger.debug(`Evaluating results of transaction execution #${transactionIndex + 1}:`, transaction.name);
                  this.emitResult(transaction, iterationCallback);
                });
              });
            });
          });
        });
      },
      (iterationError) => {
        if (iterationError) { return callback(iterationError); }

        logger.debug('Running \'afterAll\' hooks');
        this.runHooksForData(hooks.afterAllHooks, transactions, () => {
          if (this.hookHandlerError) { return callback(this.hookHandlerError); }
          callback();
        });
      });
    });
  }

  // The 'data' argument can be 'transactions' array or 'transaction' object
  runHooksForData(hooks, data, callback) {
    if (hooks && hooks.length) {
      logger.debug('Running hooks...');

      // Capture outer this
      const runHookWithData = (hookFnIndex, runHookCallback) => {
        const hookFn = hooks[hookFnIndex];
        try {
          this.runHook(hookFn, data, (err) => {
            if (err) {
              logger.debug('Hook errored:', err);
              this.emitHookError(err, data);
            }
            runHookCallback();
          });
        } catch (error) {
          // Beware! This is very problematic part of code. This try/catch block
          // catches also errors thrown in 'runHookCallback', i.e. in all
          // subsequent flow! Then also 'callback' is called twice and
          // all the flow can be executed twice. We need to reimplement this.
          if (error instanceof chai.AssertionError) {
            const transactions = Array.isArray(data) ? data : [data];
            for (const transaction of transactions) { this.failTransaction(transaction, `Failed assertion in hooks: ${error.message}`); }
          } else {
            logger.debug('Hook errored:', error);
            this.emitHookError(error, data);
          }

          runHookCallback();
        }
      };

      async.timesSeries(hooks.length, runHookWithData, () => callback());
    } else {
      callback();
    }
  }

  // The 'data' argument can be 'transactions' array or 'transaction' object.
  //
  // If it's 'transactions', it is treated as single 'transaction' anyway in this
  // function. That probably isn't correct and should be fixed eventually
  // (beware, tests count with the current behavior).
  emitHookError(error, data) {
    if (!(error instanceof Error)) { error = new Error(error); }
    const test = this.createTest(data);
    test.request = data.request;
    this.emitError(error, test);
  }

  runHook(hook, data, callback) {
    if (hook.length === 1) {
      // Sync api
      hook(data);
      callback();
    } else if (hook.length === 2) {
      // Async api
      hook(data, () => callback());
    }
  }

  configureTransaction(transaction) {
    const { configuration } = this;
    const { origin, request, response } = transaction;

    // Parse the server URL (just once, caching it in @parsedUrl)
    if (!this.parsedUrl) { this.parsedUrl = this.parseServerUrl(configuration.server); }
    const fullPath = this.getFullPath(this.parsedUrl.path, request.uri);

    const headers = headersArrayToObject(request.headers);

    // Add Dredd User-Agent (if no User-Agent is already present)
    const hasUserAgent = Object.keys(headers)
      .map(name => name.toLowerCase())
      .includes('user-agent');
    if (!hasUserAgent) {
      const system = `${os.type()} ${os.release()}; ${os.arch()}`;
      headers['User-Agent'] = `Dredd/${packageData.version} (${system})`;
    }

    // Parse and add headers from the config to the transaction
    if (configuration.options.header.length > 0) {
      for (const header of configuration.options.header) {
        const splitIndex = header.indexOf(':');
        const headerKey = header.substring(0, splitIndex);
        const headerValue = header.substring(splitIndex + 1);
        headers[headerKey] = headerValue;
      }
    }
    request.headers = headers;

    // The data models as used here must conform to Gavel.js
    // as defined in `http-response.coffee`
    const expected = { headers: headersArrayToObject(response.headers) };
    if (response.body) { expected.body = response.body; }
    if (response.status) { expected.statusCode = response.status; }
    if (response.schema) { expected.bodySchema = response.schema; }

    // Backward compatible transaction name hack. Transaction names will be
    // replaced by Canonical Transaction Paths: https://github.com/apiaryio/dredd/issues/227
    if (!this.multiBlueprint) {
      transaction.name = transaction.name.replace(`${transaction.origin.apiName} > `, '');
    }

    // Transaction skipping (can be modified in hooks). If the input format
    // is OpenAPI 2, non-2xx transactions should be skipped by default.
    let skip = false;
    if (transaction.apiDescription.mediaType.includes('swagger')) {
      const status = parseInt(response.status, 10);
      if ((status < 200) || (status >= 300)) {
        skip = true;
      }
    }
    delete transaction.apiDescription;

    const configuredTransaction = {
      name: transaction.name,
      id: `${request.method} (${expected.statusCode}) ${request.uri}`,
      host: this.parsedUrl.hostname,
      port: this.parsedUrl.port,
      request,
      expected,
      origin,
      fullPath,
      protocol: this.parsedUrl.protocol,
      skip,
    };

    return configuredTransaction;
  }

  parseServerUrl(serverUrl) {
    if (!serverUrl.match(/^https?:\/\//i)) {
      // Protocol is missing. Remove any : or / at the beginning of the URL
      // and prepend the URL with 'http://' (assumed as default fallback).
      serverUrl = `http://${serverUrl.replace(/^[:/]*/, '')}`;
    }
    return url.parse(serverUrl);
  }

  getFullPath(serverPath, requestPath) {
    if (serverPath === '/') { return requestPath; }
    if (!requestPath) { return serverPath; }

    // Join two paths
    //
    // How:
    // Removes all slashes from the beginning and from the end of each segment.
    // Then joins them together with a single slash. Then prepends the whole
    // string with a single slash.
    //
    // Why:
    // Note that 'path.join' won't work on Windows and 'url.resolve' can have
    // undesirable behavior depending on slashes.
    // See also https://github.com/joyent/node/issues/2216
    let segments = [serverPath, requestPath];
    segments = (Array.from(segments).map(segment => segment.replace(/^\/|\/$/g, '')));
    // Keep trailing slash at the end if specified in requestPath
    // and if requestPath isn't only '/'
    const trailingSlash = (requestPath !== '/') && (requestPath.slice(-1) === '/') ? '/' : '';
    return `/${segments.join('/')}${trailingSlash}`;
  }

  // Factory for 'transaction.test' object creation
  createTest(transaction) {
    return {
      status: '',
      title: transaction.id,
      message: transaction.name,
      origin: transaction.origin,
      startedAt: transaction.startedAt,
    };
  }

  // Marks the transaction as failed and makes sure everything in the transaction
  // object is set accordingly. Typically this would be invoked when transaction
  // runner decides to force a transaction to behave as failed.
  failTransaction(transaction, reason) {
    transaction.fail = true;

    this.ensureTransactionResultsGeneralSection(transaction);
    if (reason) { transaction.results.general.results.push({ severity: 'error', message: reason }); }

    if (!transaction.test) { transaction.test = this.createTest(transaction); }
    transaction.test.status = 'fail';
    if (reason) { transaction.test.message = reason; }
    let results;
    if (transaction.test.results) {
      results = transaction.test.results;
    } else {
      results = transaction.test.results = transaction.results;
    }
    return results;
  }

  // Marks the transaction as skipped and makes sure everything in the transaction
  // object is set accordingly.
  skipTransaction(transaction, reason) {
    transaction.skip = true;

    this.ensureTransactionResultsGeneralSection(transaction);
    if (reason) { transaction.results.general.results.push({ severity: 'warning', message: reason }); }

    if (!transaction.test) { transaction.test = this.createTest(transaction); }
    transaction.test.status = 'skip';
    if (reason) { transaction.test.message = reason; }
    let results;
    if (transaction.test.results) {
      results = transaction.test.results;
    } else {
      results = transaction.test.results = transaction.results;
    }
    return results;
  }

  // Ensures that given transaction object has 'results' with 'general' section
  // where custom Gavel-like errors or warnings can be inserted.
  ensureTransactionResultsGeneralSection(transaction) {
    if (!transaction.results) { transaction.results = {}; }
    if (!transaction.results.general) { transaction.results.general = {}; }
    let results;
    if (transaction.results.general.results) {
      results = transaction.results.general.results;
    } else {
      results = transaction.results.general.results = [];
    }
    return results;
  }

  // Inspects given transaction and emits 'test *' events with 'transaction.test'
  // according to the test's status
  emitResult(transaction, callback) {
    if (this.error || !transaction.test) {
      logger.debug('No emission of test data to reporters', this.error, transaction.test);
      this.error = null; // Reset the error indicator
      return callback();
    }

    if (transaction.skip) {
      logger.debug('Emitting to reporters: test skip');
      this.configuration.emitter.emit('test skip', transaction.test, eventCallback);
      return callback();
    }

    if (transaction.test.valid) {
      if (transaction.fail) {
        this.failTransaction(transaction, `Failed in after hook: ${transaction.fail}`);
        logger.debug('Emitting to reporters: test fail');
        this.configuration.emitter.emit('test fail', transaction.test, eventCallback);
      } else {
        logger.debug('Emitting to reporters: test pass');
        this.configuration.emitter.emit('test pass', transaction.test, eventCallback);
      }
      return callback();
    }

    logger.debug('Emitting to reporters: test fail');
    this.configuration.emitter.emit('test fail', transaction.test, eventCallback);
    callback();
  }

  // Emits 'test error' with given test data. Halts the transaction runner.
  emitError(error, test) {
    logger.debug('Emitting to reporters: test error');
    this.configuration.emitter.emit('test error', error, test, eventCallback);

    // Record the error to halt the transaction runner. Do not overwrite
    // the first recorded error if more of them occured.
    this.error = this.error || error;
  }

  // This is actually doing more some pre-flight and conditional skipping of
  // the transcation based on the configuration or hooks. TODO rename
  executeTransaction(transaction, hooks, callback) {
    if (!callback) { [callback, hooks] = Array.from([hooks, undefined]); }

    // Number in miliseconds (UNIX-like timestamp * 1000 precision)
    transaction.startedAt = Date.now();

    const test = this.createTest(transaction);
    logger.debug('Emitting to reporters: test start');
    this.configuration.emitter.emit('test start', test, eventCallback);

    this.ensureTransactionResultsGeneralSection(transaction);

    if (transaction.skip) {
      logger.debug('HTTP transaction was marked in hooks as to be skipped. Skipping');
      transaction.test = test;
      this.skipTransaction(transaction, 'Skipped in before hook');
      return callback();
    } if (transaction.fail) {
      logger.debug('HTTP transaction was marked in hooks as to be failed. Reporting as failed');
      transaction.test = test;
      this.failTransaction(transaction, `Failed in before hook: ${transaction.fail}`);
      return callback();
    } if (this.configuration.options['dry-run']) {
      reporterOutputLogger.info('Dry run. Not performing HTTP request');
      transaction.test = test;
      this.skipTransaction(transaction);
      return callback();
    } if (this.configuration.options.names) {
      reporterOutputLogger.info(transaction.name);
      transaction.test = test;
      this.skipTransaction(transaction);
      return callback();
    } if ((this.configuration.options.method.length > 0) && !(Array.from(this.configuration.options.method).includes(transaction.request.method))) {
      logger.debug(`\
Only ${(Array.from(this.configuration.options.method).map(m => m.toUpperCase())).join(', ')}\
requests are set to be executed. \
Not performing HTTP ${transaction.request.method.toUpperCase()} request.\
`);
      transaction.test = test;
      this.skipTransaction(transaction);
      return callback();
    } if ((this.configuration.options.only.length > 0) && !(Array.from(this.configuration.options.only).includes(transaction.name))) {
      logger.debug(`\
Only '${this.configuration.options.only}' transaction is set to be executed. \
Not performing HTTP request for '${transaction.name}'.\
`);
      transaction.test = test;
      this.skipTransaction(transaction);
      return callback();
    }
    this.performRequestAndValidate(test, transaction, hooks, callback);
  }

  // An actual HTTP request, before validation hooks triggering
  // and the response validation is invoked here
  performRequestAndValidate(test, transaction, hooks, callback) {
    const uri = url.format({
      protocol: transaction.protocol,
      hostname: transaction.host,
      port: transaction.port,
    }) + transaction.fullPath;
    const options = { http: this.configuration.http };

    performRequest(uri, transaction.request, options, (error, real) => {
      if (error) {
        logger.debug('Requesting tested server errored:', error);
        test.title = transaction.id;
        test.expected = transaction.expected;
        test.request = transaction.request;
        this.emitError(error, test);
        return callback();
      }
      transaction.real = real;

      if (!transaction.real.body && transaction.expected.body) {
        // Leaving body as undefined skips its validation completely. In case
        // there is no real body, but there is one expected, the empty string
        // ensures Gavel does the validation.
        transaction.real.body = '';
      }

      logger.debug('Running \'beforeEachValidation\' hooks');
      this.runHooksForData(hooks && hooks.beforeEachValidationHooks, transaction, () => {
        if (this.hookHandlerError) { return callback(this.hookHandlerError); }

        logger.debug('Running \'beforeValidation\' hooks');
        this.runHooksForData(hooks && hooks.beforeValidationHooks[transaction.name], transaction, () => {
          if (this.hookHandlerError) { return callback(this.hookHandlerError); }

          this.validateTransaction(test, transaction, callback);
        });
      });
    });
  }

  validateTransaction(test, transaction, callback) {
    logger.debug('Validating HTTP transaction by Gavel.js');
    logger.debug('Determining whether HTTP transaction is valid (getting boolean verdict)');
    gavel.isValid(transaction.real, transaction.expected, 'response', (isValidError, isValid) => {
      if (isValidError) {
        logger.debug('Gavel.js validation errored:', isValidError);
        this.emitError(isValidError, test);
      }

      test.title = transaction.id;
      test.actual = transaction.real;
      test.expected = transaction.expected;
      test.request = transaction.request;

      if (isValid) {
        test.status = 'pass';
      } else {
        test.status = 'fail';
      }

      logger.debug('Validating HTTP transaction (getting verbose validation result)');
      gavel.validate(transaction.real, transaction.expected, 'response', (validateError, gavelResult) => {
        if (!isValidError && validateError) {
          logger.debug('Gavel.js validation errored:', validateError);
          this.emitError(validateError, test);
        }

        // Warn about empty responses
        // Expected is as string, actual is as integer :facepalm:
        const isExpectedResponseStatusCodeEmpty = ['204', '205'].includes(
          test.expected.statusCode ? test.expected.statusCode.toString() : undefined
        );
        const isActualResponseStatusCodeEmpty = ['204', '205'].includes(
          test.actual.statusCode ? test.actual.statusCode.toString() : undefined
        );
        const hasBody = (test.expected.body || test.actual.body);
        if ((isExpectedResponseStatusCodeEmpty || isActualResponseStatusCodeEmpty) && hasBody) {
          logger.warn(`\
${test.title} HTTP 204 and 205 responses must not \
include a message body: https://tools.ietf.org/html/rfc7231#section-6.3\
`);
        }

        // Create test message from messages of all validation errors
        let message = '';
        const object = gavelResult || {};
        let validatorOutput;
        for (const sectionName of Object.keys(object || {})) {
          // Section names are 'statusCode', 'headers', 'body' (and 'version', which is irrelevant)
          validatorOutput = object[sectionName];
          if (sectionName !== 'version') {
            for (const gavelError of validatorOutput.results || []) {
              message += `${sectionName}: ${gavelError.message}\n`;
            }
          }
        }
        test.message = message;

        // Record raw validation output to transaction results object
        //
        // It looks like the transaction object can already contain 'results'.
        // (Needs to be prooved, the assumption is based just on previous
        // version of the code.) In that case, we want to save the new validation
        // output, but we want to keep at least the original array of Gavel errors.
        const results = transaction.results || {};
        for (const sectionName of Object.keys(gavelResult || {})) {
          // Section names are 'statusCode', 'headers', 'body' (and 'version', which is irrelevant)
          const rawValidatorOutput = gavelResult[sectionName];
          if (sectionName !== 'version') {
            if (!results[sectionName]) { results[sectionName] = {}; }

            // We don't want to modify the object and we want to get rid of some
            // custom Gavel.js types ('clone' will keep just plain JS objects).
            validatorOutput = clone(rawValidatorOutput);

            // If transaction already has the 'results' object, ...
            if (results[sectionName].results) {
              // ...then take all Gavel errors it contains and add them to the array
              // of Gavel errors in the new validator output object...
              validatorOutput.results = validatorOutput.results.concat(results[sectionName].results);
            }
            // ...and replace the original validator object with the new one.
            results[sectionName] = validatorOutput;
          }
        }
        transaction.results = results;

        // Set the validation results and the boolean verdict to the test object
        test.results = transaction.results;
        test.valid = isValid;

        // Propagate test object so 'after' hooks can modify it
        transaction.test = test;
        callback();
      });
    });
  }

  emitEnd(callback) {
    let reporterCount = this.configuration.emitter.listeners('end').length;
    this.configuration.emitter.emit('end', () => {
      reporterCount--;
      if (reporterCount === 0) { callback(); }
    });
  }
}

module.exports = TransactionRunner;
