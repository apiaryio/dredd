// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
const requestLib = require('request');
const url = require('url');
const path = require('path');
const os = require('os');
const chai = require('chai');
const gavel = require('gavel');
const async = require('async');
const clone = require('clone');
const caseless = require('caseless');
const {Pitboss} = require('pitboss-ng');

const addHooks = require('./add-hooks');
const sortTransactions = require('./sort-transactions');
const packageData = require('./../package.json');
const logger = require('./logger');


const headersArrayToObject = function(arr) {
  const obj = {};
  for (let {name, value} of arr) { obj[name] = value; }
  return obj;
};


const eventCallback = function(reporterError) {
  if (reporterError) { return logger.error(reporterError.message); }
};


// use "lib" folder, because pitboss-ng does not support "coffee-script:register"
// out of the box now
const sandboxedLogLibraryPath = '../../../lib/hooks-log-sandboxed';

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
    return this.multiBlueprint = Object.keys(this.configuration.data).length > 1;
  }

  run(transactions, callback) {
    logger.verbose('Sorting HTTP transactions');
    transactions = this.configuration.options['sorted'] ? sortTransactions(transactions) : transactions;

    logger.verbose('Configuring HTTP transactions');
    transactions = transactions.map(this.configureTransaction.bind(this));

    // Remainings of functional approach, probs to be eradicated
    logger.verbose('Reading hook files and registering hooks');
    return addHooks(this, transactions, addHooksError => {
      if (addHooksError) { return callback(addHooksError); }

      logger.verbose('Executing HTTP transactions');
      return this.executeAllTransactions(transactions, this.hooks, callback);
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
    // /end warning

    if (this.hookHandlerError) { return callback(this.hookHandlerError); }

    logger.verbose('Running \'beforeAll\' hooks');
    return this.runHooksForData(hooks.beforeAllHooks, transactions, true, () => {
      if (this.hookHandlerError) { return callback(this.hookHandlerError); }

      // Iterate over transactions' transaction
      // Because async changes the way referencing of properties work,
      // we need to work with indexes (keys) here, no other way of access.
      return async.timesSeries(transactions.length, (transactionIndex, iterationCallback) => {
        transaction = transactions[transactionIndex];
        logger.verbose(`Processing transaction #${transactionIndex + 1}:`, transaction.name);

        logger.verbose('Running \'beforeEach\' hooks');
        return this.runHooksForData(hooks.beforeEachHooks, transaction, false, () => {
          if (this.hookHandlerError) { return iterationCallback(this.hookHandlerError); }

          logger.verbose('Running \'before\' hooks');
          return this.runHooksForData(hooks.beforeHooks[transaction.name], transaction, false, () => {
            if (this.hookHandlerError) { return iterationCallback(this.hookHandlerError); }

            // This method:
            // - skips and fails based on hooks or options
            // - executes a request
            // - recieves a response
            // - runs beforeEachValidation hooks
            // - runs beforeValidation hooks
            // - runs Gavel validation
            return this.executeTransaction(transaction, hooks, () => {
              if (this.hookHandlerError) { return iterationCallback(this.hookHandlerError); }

              logger.verbose('Running \'afterEach\' hooks');
              return this.runHooksForData(hooks.afterEachHooks, transaction, false, () => {
                if (this.hookHandlerError) { return iterationCallback(this.hookHandlerError); }

                logger.verbose('Running \'after\' hooks');
                return this.runHooksForData(hooks.afterHooks[transaction.name], transaction, false, () => {
                  if (this.hookHandlerError) { return iterationCallback(this.hookHandlerError); }

                  logger.debug(`Evaluating results of transaction execution #${transactionIndex + 1}:`, transaction.name);
                  return this.emitResult(transaction, iterationCallback);
                });
              });
            });
          });
        });
      }

      , iterationError => {
        if (iterationError) { return callback(iterationError); }

        logger.verbose('Running \'afterAll\' hooks');
        return this.runHooksForData(hooks.afterAllHooks, transactions, true, () => {
          if (this.hookHandlerError) { return callback(this.hookHandlerError); }
          return callback();
        });
      });
    });
  }

  // The 'data' argument can be 'transactions' array or 'transaction' object
  runHooksForData(hooks, data, legacy = false, callback) {
    if (hooks != null ? hooks.length : undefined) {
      logger.debug('Running hooks...');

      const runHookWithData = (hookFnIndex, runHookCallback) => {
        const hookFn = hooks[hookFnIndex];
        try {
          if (legacy) {
            // Legacy mode is only for running beforeAll and afterAll hooks with
            // old API, i.e. callback as a first argument

            return this.runLegacyHook(hookFn, data, err => {
              if (err) {
                logger.debug('Legacy hook errored:', err);
                this.emitHookError(err, data);
              }
              return runHookCallback();
            });
          } else {
            return this.runHook(hookFn, data, err => {
              if (err) {
                logger.debug('Hook errored:', err);
                this.emitHookError(err, data);
              }
              return runHookCallback();
            });
          }

        } catch (error) {
          // Beware! This is very problematic part of code. This try/catch block
          // catches also errors thrown in 'runHookCallback', i.e. in all
          // subsequent flow! Then also 'callback' is called twice and
          // all the flow can be executed twice. We need to reimplement this.
          if (error instanceof chai.AssertionError) {
            const transactions = Array.isArray(data) ? data : [data];
            for (let transaction of transactions) { this.failTransaction(transaction, `Failed assertion in hooks: ${error.message}`); }
          } else {
            logger.debug('Hook errored:', error);
            this.emitHookError(error, data);
          }

          return runHookCallback();
        }
      };

      return async.timesSeries(hooks.length, runHookWithData, () => callback());
    } else {
      return callback();
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
    return this.emitError(error, test);
  }

  sandboxedHookResultsHandler(err, data, results = {}, callback) {
    if (err) { return callback(err); }

    // reference to `transaction` gets lost here if whole object is assigned
    // this is workaround how to copy properties - clone doesn't work either
    const object = results.data || {};
    for (let key in object) {
      const value = object[key];
      data[key] = value;
    }
    this.hookStash = results.stash;

    if (this.logs == null) { this.logs = []; }
    for (let log of results.logs || []) {
      this.logs.push(log);
    }

    // For unknown reasons, the sandboxed code in Pitboss runs in "future"
    // on Windows (and just sometimes - it's flaky). The extreme case is
    // that sandboxed 'before' hooks can have timestamps with a millisecond
    // later time then the HTTP transaction itself. Following line
    // synchronizes the time. It waits until the time of the normal Node.js
    // runtime happens to be later than time inside the Pitboss sandbox.
    while ((Date.now() - results.now) < 0) {} // ...then do nothing...

    callback();
  }

  sandboxedWrappedCode(hookCode) {
    return `\
// run the hook
var log = _log.bind(null, _logs);

var _func = ${hookCode};
_func(_data);

// setup the return object
var output = {};
output["data"] = _data;
output["stash"] = stash;
output["logs"] = _logs;
output["now"] = Date.now();
output;\
`;
  }

  runSandboxedHookFromString(hookString, data, callback) {
    const wrappedCode = this.sandboxedWrappedCode(hookString);

    const sandbox = new Pitboss(wrappedCode, {timeout: 500});
    return sandbox.run({
      context: {
        '_data': data,
        '_logs': [],
        'stash': this.hookStash
      },
      libraries: {
        '_log': sandboxedLogLibraryPath
      }
    }
    , (err, result = {}) => {
      sandbox.kill();
      return this.sandboxedHookResultsHandler(err, data, result, callback);
    });
  }

  // Will be used runHook instead in next major release, see deprecation warning
  runLegacyHook(hook, data, callback) {
    // not sandboxed mode - hook is a function
    if (typeof(hook) === 'function') {
      if (hook.length === 1) {
        // sync api
        logger.warn(`\
DEPRECATION WARNING!

You are using only one argument for the \`beforeAll\` or \`afterAll\` hook function.
One argument hook functions will be treated as synchronous in the near future.
To keep the async behaviour, just define hook function with two parameters.

Interface of the hooks functions will be unified soon across all hook functions:

 - \`beforeAll\` and \`afterAll\` hooks will support sync API depending on number of arguments
 - Signatures of callbacks of all hooks will be the same
 - First passed argument will be a \`transactions\` object
 - Second passed argument will be a optional callback function for async
 - \`transactions\` object in \`hooks\` module object will be removed
 - Manipulation with transaction data will have to be performed on the first function argument\
`);

        // DEPRECATION WARNING
        // this will not be supported in future hook function will be called with
        // data synchronously and callback will be called immediatelly and not
        // passed as a second argument
        hook(callback);

      } else if (hook.length === 2) {
        // async api
        hook(data, () => callback());
      }
    }

    // sandboxed mode - hook is a string - only sync API
    if (typeof(hook) === 'string') {
      return this.runSandboxedHookFromString(hook, data, callback);
    }
  }

  runHook(hook, data, callback) {
    // not sandboxed mode - hook is a function
    if (typeof(hook) === 'function') {
      if (hook.length === 1) {
        // sync api
        hook(data);
        callback();
      } else if (hook.length === 2) {
        // async api
        hook(data, () => callback());
      }
    }

    // sandboxed mode - hook is a string - only sync API
    if (typeof(hook) === 'string') {
      return this.runSandboxedHookFromString(hook, data, callback);
    }
  }

  configureTransaction(transaction) {
    let needle;
    let name;
    const { configuration } = this;

    const {origin, request, response} = transaction;
    const mediaType = (configuration.data[origin.filename] != null ? configuration.data[origin.filename].mediaType : undefined) || 'text/vnd.apiblueprint';

    // Parse the server URL (just once, caching it in @parsedUrl)
    if (this.parsedUrl == null) { this.parsedUrl = this.parseServerUrl(configuration.server); }
    const fullPath = this.getFullPath(this.parsedUrl.path, request.uri);

    const headers = headersArrayToObject(request.headers);

    // Add Dredd User-Agent (if no User-Agent is already present)
    if ((needle = 'user-agent', !Array.from(((() => {
      const result = [];
      for (name of Object.keys(headers)) {         result.push(name.toLowerCase());
      }
      return result;
    })())).includes(needle))) {
      const system = os.type() + ' ' + os.release() + '; ' + os.arch();
      headers['User-Agent'] = `Dredd/${packageData.version} (${system})`;
    }

    // Parse and add headers from the config to the transaction
    if (configuration.options.header.length > 0) {
      for (let header of configuration.options.header) {
        const splitIndex = header.indexOf(':');
        const headerKey = header.substring(0, splitIndex);
        const headerValue = header.substring(splitIndex + 1);
        headers[headerKey] = headerValue;
      }
    }
    request.headers = headers;

    // The data models as used here must conform to Gavel.js
    // as defined in `http-response.coffee`
    const expected = {headers: headersArrayToObject(response.headers)};
    if (response.body) { expected.body = response.body; }
    if (response.status) { expected.statusCode = response.status; }
    if (response.schema) { expected.bodySchema = response.schema; }

    // Backward compatible transaction name hack. Transaction names will be
    // replaced by Canonical Transaction Paths: https://github.com/apiaryio/dredd/issues/227
    if (!this.multiBlueprint) {
      transaction.name = transaction.name.replace(`${transaction.origin.apiName} > `, "");
    }

    // Transaction skipping (can be modified in hooks). If the input format
    // is Swagger, non-2xx transactions should be skipped by default.
    let skip = false;
    if (mediaType.indexOf('swagger') !== -1) {
      const status = parseInt(response.status, 10);
      if ((status < 200) || (status >= 300)) {
        skip = true;
      }
    }

    const configuredTransaction = {
      name: transaction.name,
      id: request.method + ' (' + expected.statusCode + ') ' + request.uri,
      host: this.parsedUrl.hostname,
      port: this.parsedUrl.port,
      request,
      expected,
      origin,
      fullPath,
      protocol: this.parsedUrl.protocol,
      skip
    };

    return configuredTransaction;
  }

  parseServerUrl(serverUrl) {
    if (!serverUrl.match(/^https?:\/\//i)) {
      // Protocol is missing. Remove any : or / at the beginning of the URL
      // and prepend the URL with 'http://' (assumed as default fallback).
      serverUrl = `http://${serverUrl.replace(/^[:\/]*/, '')}`;
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
    segments = (Array.from(segments).map((segment) => segment.replace(/^\/|\/$/g, '')));
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
      startedAt: transaction.startedAt
    };
  }

  // Marks the transaction as failed and makes sure everything in the transaction
  // object is set accordingly. Typically this would be invoked when transaction
  // runner decides to force a transaction to behave as failed.
  failTransaction(transaction, reason) {
    transaction.fail = true;

    this.ensureTransactionResultsGeneralSection(transaction);
    if (reason) { transaction.results.general.results.push({severity: 'error', message: reason}); }

    if (transaction.test == null) { transaction.test = this.createTest(transaction); }
    transaction.test.status = 'fail';
    if (reason) { transaction.test.message = reason; }
    return transaction.test.results != null ? transaction.test.results : (transaction.test.results = transaction.results);
  }

  // Marks the transaction as skipped and makes sure everything in the transaction
  // object is set accordingly.
  skipTransaction(transaction, reason) {
    transaction.skip = true;

    this.ensureTransactionResultsGeneralSection(transaction);
    if (reason) { transaction.results.general.results.push({severity: 'warning', message: reason}); }

    if (transaction.test == null) { transaction.test = this.createTest(transaction); }
    transaction.test.status = 'skip';
    if (reason) { transaction.test.message = reason; }
    return transaction.test.results != null ? transaction.test.results : (transaction.test.results = transaction.results);
  }

  // Ensures that given transaction object has 'results' with 'general' section
  // where custom Gavel-like errors or warnings can be inserted.
  ensureTransactionResultsGeneralSection(transaction) {
    if (transaction.results == null) { transaction.results = {}; }
    if (transaction.results.general == null) { transaction.results.general = {}; }
    return transaction.results.general.results != null ? transaction.results.general.results : (transaction.results.general.results = []);
  }

  // Inspects given transaction and emits 'test *' events with 'transaction.test'
  // according to the test's status
  emitResult(transaction, callback) {
    if (this.error || !transaction.test) {
      logger.debug('No emission of test data to reporters', this.error, transaction.test);
      this.error = null; // reset the error indicator
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
    return callback();
  }

  // Emits 'test error' with given test data. Halts the transaction runner.
  emitError(error, test) {
    logger.debug('Emitting to reporters: test error');
    this.configuration.emitter.emit('test error', error, test, eventCallback);

    // Record the error to halt the transaction runner. Do not overwrite
    // the first recorded error if more of them occured.
    return this.error = this.error || error;
  }

  getRequestOptionsFromTransaction(transaction) {
    const urlObject = {
      protocol: transaction.protocol,
      hostname: transaction.host,
      port: transaction.port
    };

    const options = clone(this.configuration.http || {});
    options.uri = url.format(urlObject) + transaction.fullPath;
    options.method = transaction.request.method;
    options.headers = transaction.request.headers;
    options.body = transaction.request.body;
    options.proxy = false;
    options.followRedirect = false;
    return options;
  }

  // This is actually doing more some pre-flight and conditional skipping of
  // the transcation based on the configuration or hooks. TODO rename
  executeTransaction(transaction, hooks, callback) {
    if (!callback) { [callback, hooks] = Array.from([hooks, undefined]); }

    // number in miliseconds (UNIX-like timestamp * 1000 precision)
    transaction.startedAt = Date.now();

    const test = this.createTest(transaction);
    logger.debug('Emitting to reporters: test start');
    this.configuration.emitter.emit('test start', test, eventCallback);

    this.ensureTransactionResultsGeneralSection(transaction);

    if (transaction.skip) {
      logger.verbose('HTTP transaction was marked in hooks as to be skipped. Skipping');
      transaction.test = test;
      this.skipTransaction(transaction, 'Skipped in before hook');
      return callback();

    } else if (transaction.fail) {
      logger.verbose('HTTP transaction was marked in hooks as to be failed. Reporting as failed');
      transaction.test = test;
      this.failTransaction(transaction, `Failed in before hook: ${transaction.fail}`);
      return callback();

    } else if (this.configuration.options['dry-run']) {
      logger.info('Dry run. Not performing HTTP request');
      transaction.test = test;
      this.skipTransaction(transaction);
      return callback();

    } else if (this.configuration.options.names) {
      logger.info(transaction.name);
      transaction.test = test;
      this.skipTransaction(transaction);
      return callback();

    } else if ((this.configuration.options.method.length > 0) && !(Array.from(this.configuration.options.method).includes(transaction.request.method))) {
      logger.info(`\
Only ${(Array.from(this.configuration.options.method).map((m) => m.toUpperCase())).join(', ')}\
requests are set to be executed. \
Not performing HTTP ${transaction.request.method.toUpperCase()} request.\
`);
      transaction.test = test;
      this.skipTransaction(transaction);
      return callback();

    } else if ((this.configuration.options.only.length > 0) && !(Array.from(this.configuration.options.only).includes(transaction.name))) {
      logger.info(`\
Only '${this.configuration.options.only}' transaction is set to be executed. \
Not performing HTTP request for '${transaction.name}'.\
`);
      transaction.test = test;
      this.skipTransaction(transaction);
      return callback();

    } else {
      return this.performRequestAndValidate(test, transaction, hooks, callback);
    }
  }

  // Sets the Content-Length header. Overrides user-provided Content-Length
  // header value in case it's out of sync with the real length of the body.
  setContentLength(transaction) {
    const { headers } = transaction.request;
    const { body } = transaction.request;

    const contentLengthHeaderName = caseless(headers).has('Content-Length');
    if (contentLengthHeaderName) {
      const contentLengthValue = parseInt(headers[contentLengthHeaderName], 10);

      if (body) {
        const calculatedContentLengthValue = Buffer.byteLength(body);
        if (contentLengthValue !== calculatedContentLengthValue) {
          logger.warn(`\
Specified Content-Length header is ${contentLengthValue}, but \
the real body length is ${calculatedContentLengthValue}. Using \
${calculatedContentLengthValue} instead.\
`);
          return headers[contentLengthHeaderName] = calculatedContentLengthValue;
        }

      } else if (contentLengthValue !== 0) {
        logger.warn(`\
Specified Content-Length header is ${contentLengthValue}, but \
the real body length is 0. Using 0 instead.\
`);
        return headers[contentLengthHeaderName] = 0;
      }

    } else {
      return headers['Content-Length'] = body ? Buffer.byteLength(body) : 0;
    }
  }

  // An actual HTTP request, before validation hooks triggering
  // and the response validation is invoked here
  performRequestAndValidate(test, transaction, hooks, callback) {
    if (transaction.request.body && this.isMultipart(transaction.request.headers)) {
      transaction.request.body = this.fixApiBlueprintMultipartBody(transaction.request.body);
    }

    this.setContentLength(transaction);
    const requestOptions = this.getRequestOptionsFromTransaction(transaction);

    const handleRequest = (err, res, body) => {
      if (err) {
        logger.debug('Requesting tested server errored:', `${err}` || err.code);
        test.title = transaction.id;
        test.expected = transaction.expected;
        test.request = transaction.request;
        this.emitError(err, test);
        return callback();
      }

      logger.verbose('Handling HTTP response from tested server');

      // The data models as used here must conform to Gavel.js as defined in 'http-response.coffee'
      transaction.real = {
        statusCode: res.statusCode,
        headers: res.headers
      };

      if (body) {
        transaction.real.body = body;
      } else if (transaction.expected.body) {
        // Leaving body as undefined skips its validation completely. In case
        // there is no real body, but there is one expected, the empty string
        // ensures Gavel does the validation.
        transaction.real.body = '';
      }

      logger.verbose('Running \'beforeEachValidation\' hooks');
      return this.runHooksForData(hooks != null ? hooks.beforeEachValidationHooks : undefined, transaction, false, () => {
        if (this.hookHandlerError) { return callback(this.hookHandlerError); }

        logger.verbose('Running \'beforeValidation\' hooks');
        return this.runHooksForData(hooks != null ? hooks.beforeValidationHooks[transaction.name] : undefined, transaction, false, () => {
          if (this.hookHandlerError) { return callback(this.hookHandlerError); }

          return this.validateTransaction(test, transaction, callback);
        });
      });
    };

    try {
      return this.performRequest(requestOptions, handleRequest);
    } catch (error) {
      logger.debug('Requesting tested server errored:', error);
      test.title = transaction.id;
      test.expected = transaction.expected;
      test.request = transaction.request;
      this.emitError(error, test);
      return callback();
    }
  }

  performRequest(options, callback) {
    const protocol = options.uri.split(':')[0].toUpperCase();
    logger.verbose(`\
About to perform an ${protocol} request to the server \
under test: ${options.method} ${options.uri}\
`);
    return requestLib(options, callback);
  }

  validateTransaction(test, transaction, callback) {
    logger.verbose('Validating HTTP transaction by Gavel.js');
    logger.debug('Determining whether HTTP transaction is valid (getting boolean verdict)');
    return gavel.isValid(transaction.real, transaction.expected, 'response', (isValidError, isValid) => {
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
      return gavel.validate(transaction.real, transaction.expected, 'response', (validateError, gavelResult) => {
        let needle, needle1, validatorOutput;
        if (!isValidError && validateError) {
          logger.debug('Gavel.js validation errored:', validateError);
          this.emitError(validateError, test);
        }

        // Warn about empty responses
        if (
          ( // expected is as string, actual is as integer :facepalm:
            (needle = test.expected.statusCode != null ? test.expected.statusCode.toString() : undefined, ['204', '205'].includes(needle)) ||
            (needle1 = test.actual.statusCode != null ? test.actual.statusCode.toString() : undefined, ['204', '205'].includes(needle1))
          ) && (test.expected.body || test.actual.body)
        ) {
          logger.warn(`\
${test.title} HTTP 204 and 205 responses must not \
include a message body: https://tools.ietf.org/html/rfc7231#section-6.3\
`);
        }

        // Create test message from messages of all validation errors
        let message = '';
        const object = gavelResult || {};
        for (var sectionName of Object.keys(object || {})) {
          // Section names are 'statusCode', 'headers', 'body' (and 'version', which is irrelevant)
          validatorOutput = object[sectionName];
          if (sectionName !== 'version') {
            for (let gavelError of validatorOutput.results || []) {
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
        for (sectionName of Object.keys(gavelResult || {})) {
          // Section names are 'statusCode', 'headers', 'body' (and 'version', which is irrelevant)
          const rawValidatorOutput = gavelResult[sectionName];
          if (sectionName !== 'version') {
            if (results[sectionName] == null) { results[sectionName] = {}; }

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
        return callback();
      });
    });
  }

  isMultipart(headers) {
    const contentType = caseless(headers).get('Content-Type');
    if (contentType) {
      return contentType.indexOf('multipart') > -1;
    } else {
      return false;
    }
  }

  // Finds newlines not preceeded by carriage returns and replaces them by
  // newlines preceeded by carriage returns.
  //
  // See https://github.com/apiaryio/api-blueprint/issues/401
  fixApiBlueprintMultipartBody(body) {
    return body.replace(/\r?\n/g, '\r\n');
  }
}


module.exports = TransactionRunner;
