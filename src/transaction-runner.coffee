requestLib = require 'request'
url = require 'url'
path = require 'path'
os = require 'os'
chai = require 'chai'
gavel = require 'gavel'
async = require 'async'
clone = require 'clone'
caseless = require 'caseless'
{Pitboss} = require 'pitboss-ng'

addHooks = require './add-hooks'
sortTransactions = require './sort-transactions'
packageData = require './../package.json'
logger = require './logger'


headersArrayToObject = (arr) ->
  obj = {}
  obj[name] = value for {name, value} in arr
  return obj


eventCallback = (reporterError) ->
  logger.error(reporterError.message) if reporterError


# use "lib" folder, because pitboss-ng does not support "coffee-script:register"
# out of the box now
sandboxedLogLibraryPath = '../../../lib/hooks-log-sandboxed'

class TransactionRunner
  constructor: (@configuration) ->
    @logs = []
    @hookStash = {}
    @error = null
    @hookHandlerError = null

  config: (config) ->
    @configuration = config
    @multiBlueprint = Object.keys(@configuration.data).length > 1

  run: (transactions, callback) ->
    logger.verbose('Sorting HTTP transactions')
    transactions = if @configuration.options['sorted'] then sortTransactions(transactions) else transactions

    logger.verbose('Configuring HTTP transactions')
    transactions = transactions.map(@configureTransaction.bind(@))

    # Remainings of functional approach, probs to be eradicated
    logger.verbose('Reading hook files and registering hooks')
    addHooks @, transactions, (addHooksError) =>
      return callback addHooksError if addHooksError

      logger.verbose('Executing HTTP transactions')
      @executeAllTransactions(transactions, @hooks, callback)

  executeAllTransactions: (transactions, hooks, callback) ->
    # Warning: Following lines is "differently" performed by 'addHooks'
    # in TransactionRunner.run call. Because addHooks creates hooks.transactions
    # as an object `{}` with transaction.name keys and value is every
    # transaction, we do not fill transactions from executeAllTransactions here.
    # Transactions is supposed to be an Array here!
    unless hooks.transactions
      hooks.transactions = {}
      for transaction in transactions
        hooks.transactions[transaction.name] = transaction
    # /end warning

    return callback(@hookHandlerError) if @hookHandlerError

    logger.verbose('Running \'beforeAll\' hooks')
    @runHooksForData hooks.beforeAllHooks, transactions, true, =>
      return callback(@hookHandlerError) if @hookHandlerError

      # Iterate over transactions' transaction
      # Because async changes the way referencing of properties work,
      # we need to work with indexes (keys) here, no other way of access.
      async.timesSeries transactions.length, (transactionIndex, iterationCallback) =>
        transaction = transactions[transactionIndex]
        logger.verbose("Processing transaction ##{transactionIndex + 1}:", transaction.name)

        logger.verbose('Running \'beforeEach\' hooks')
        @runHooksForData hooks.beforeEachHooks, transaction, false, =>
          return iterationCallback(@hookHandlerError) if @hookHandlerError

          logger.verbose('Running \'before\' hooks')
          @runHooksForData hooks.beforeHooks[transaction.name], transaction, false, =>
            return iterationCallback(@hookHandlerError) if @hookHandlerError

            # This method:
            # - skips and fails based on hooks or options
            # - executes a request
            # - recieves a response
            # - runs beforeEachValidation hooks
            # - runs beforeValidation hooks
            # - runs Gavel validation
            @executeTransaction transaction, hooks, =>
              return iterationCallback(@hookHandlerError) if @hookHandlerError

              logger.verbose('Running \'afterEach\' hooks')
              @runHooksForData hooks.afterEachHooks, transaction, false, =>
                return iterationCallback(@hookHandlerError) if @hookHandlerError

                logger.verbose('Running \'after\' hooks')
                @runHooksForData hooks.afterHooks[transaction.name], transaction, false, =>
                  return iterationCallback(@hookHandlerError) if @hookHandlerError

                  logger.debug("Evaluating results of transaction execution ##{transactionIndex + 1}:", transaction.name)
                  @emitResult transaction, iterationCallback

      , (iterationError) =>
        return callback(iterationError) if iterationError

        logger.verbose('Running \'afterAll\' hooks')
        @runHooksForData hooks.afterAllHooks, transactions, true, =>
          return callback(@hookHandlerError) if @hookHandlerError
          callback()

  # The 'data' argument can be 'transactions' array or 'transaction' object
  runHooksForData: (hooks, data, legacy = false, callback) ->
    if hooks?.length
      logger.debug('Running hooks...')

      runHookWithData = (hookFnIndex, runHookCallback) =>
        hookFn = hooks[hookFnIndex]
        try
          if legacy
            # Legacy mode is only for running beforeAll and afterAll hooks with
            # old API, i.e. callback as a first argument

            @runLegacyHook hookFn, data, (err) =>
              if err
                logger.debug('Legacy hook errored:', err)
                @emitHookError(err, data)
              runHookCallback()
          else
            @runHook hookFn, data, (err) =>
              if err
                logger.debug('Hook errored:', err)
                @emitHookError(err, data)
              runHookCallback()

        catch error
          # Beware! This is very problematic part of code. This try/catch block
          # catches also errors thrown in 'runHookCallback', i.e. in all
          # subsequent flow! Then also 'callback' is called twice and
          # all the flow can be executed twice. We need to reimplement this.
          if error instanceof chai.AssertionError
            transactions = if Array.isArray(data) then data else [data]
            @failTransaction(transaction, "Failed assertion in hooks: #{error.message}") for transaction in transactions
          else
            logger.debug('Hook errored:', error)
            @emitHookError(error, data)

          runHookCallback()

      async.timesSeries hooks.length, runHookWithData, ->
        callback()
    else
      callback()

  # The 'data' argument can be 'transactions' array or 'transaction' object.
  #
  # If it's 'transactions', it is treated as single 'transaction' anyway in this
  # function. That probably isn't correct and should be fixed eventually
  # (beware, tests count with the current behavior).
  emitHookError: (error, data) ->
    error = new Error(error) unless error instanceof Error
    test = @createTest(data)
    test.request = data.request
    @emitError(error, test)

  sandboxedHookResultsHandler: (err, data, results = {}, callback) ->
    return callback err if err

    # reference to `transaction` gets lost here if whole object is assigned
    # this is workaround how to copy properties - clone doesn't work either
    for key, value of results.data or {}
      data[key] = value
    @hookStash = results.stash

    @logs ?= []
    for log in results.logs or []
      @logs.push log

    # For unknown reasons, the sandboxed code in Pitboss runs in "future"
    # on Windows (and just sometimes - it's flaky). The extreme case is
    # that sandboxed 'before' hooks can have timestamps with a millisecond
    # later time then the HTTP transaction itself. Following line
    # synchronizes the time. It waits until the time of the normal Node.js
    # runtime happens to be later than time inside the Pitboss sandbox.
    while Date.now() - results.now < 0 then # ...then do nothing...

    callback()
    return

  sandboxedWrappedCode: (hookCode) ->
    return """
      // run the hook
      var log = _log.bind(null, _logs);

      var _func = #{hookCode};
      _func(_data);

      // setup the return object
      var output = {};
      output["data"] = _data;
      output["stash"] = stash;
      output["logs"] = _logs;
      output["now"] = Date.now();
      output;
    """

  runSandboxedHookFromString: (hookString, data, callback) ->
    wrappedCode = @sandboxedWrappedCode hookString

    sandbox = new Pitboss(wrappedCode, {timeout: 500})
    sandbox.run
      context:
        '_data': data
        '_logs': []
        'stash': @hookStash
      libraries:
        '_log': sandboxedLogLibraryPath
    , (err, result = {}) =>
      sandbox.kill()
      @sandboxedHookResultsHandler err, data, result, callback

  # Will be used runHook instead in next major release, see deprecation warning
  runLegacyHook: (hook, data, callback) ->
    # not sandboxed mode - hook is a function
    if typeof(hook) == 'function'
      if hook.length is 1
        # sync api
        logger.warn('''\
          DEPRECATION WARNING!

          You are using only one argument for the `beforeAll` or `afterAll` hook function.
          One argument hook functions will be treated as synchronous in the near future.
          To keep the async behaviour, just define hook function with two parameters.

          Interface of the hooks functions will be unified soon across all hook functions:

           - `beforeAll` and `afterAll` hooks will support sync API depending on number of arguments
           - Signatures of callbacks of all hooks will be the same
           - First passed argument will be a `transactions` object
           - Second passed argument will be a optional callback function for async
           - `transactions` object in `hooks` module object will be removed
           - Manipulation with transaction data will have to be performed on the first function argument
        ''')

        # DEPRECATION WARNING
        # this will not be supported in future hook function will be called with
        # data synchronously and callback will be called immediatelly and not
        # passed as a second argument
        hook callback

      else if hook.length is 2
        # async api
        hook data, ->
          callback()

    # sandboxed mode - hook is a string - only sync API
    if typeof(hook) == 'string'
      @runSandboxedHookFromString hook, data, callback

  runHook: (hook, data, callback) ->
    # not sandboxed mode - hook is a function
    if typeof(hook) == 'function'
      if hook.length is 1
        # sync api
        hook data
        callback()
      else if hook.length is 2
        # async api
        hook data, ->
          callback()

    # sandboxed mode - hook is a string - only sync API
    if typeof(hook) == 'string'
      @runSandboxedHookFromString hook, data, callback

  configureTransaction: (transaction) =>
    configuration = @configuration

    {origin, request, response} = transaction
    mediaType = configuration.data[origin.filename]?.mediaType or 'text/vnd.apiblueprint'

    # Parse the server URL (just once, caching it in @parsedUrl)
    @parsedUrl ?= @parseServerUrl(configuration.server)
    fullPath = @getFullPath(@parsedUrl.path, request.uri)

    headers = headersArrayToObject(request.headers)

    # Add Dredd User-Agent (if no User-Agent is already present)
    if 'user-agent' not in (name.toLowerCase() for name in Object.keys(headers))
      system = os.type() + ' ' + os.release() + '; ' + os.arch()
      headers['User-Agent'] = "Dredd/#{packageData.version} (#{system})"

    # Parse and add headers from the config to the transaction
    if configuration.options.header.length > 0
      for header in configuration.options.header
        splitIndex = header.indexOf(':')
        headerKey = header.substring(0, splitIndex)
        headerValue = header.substring(splitIndex + 1)
        headers[headerKey] = headerValue
    request.headers = headers

    # The data models as used here must conform to Gavel.js
    # as defined in `http-response.coffee`
    expected = {headers: headersArrayToObject(response.headers)}
    expected.body = response.body if response.body
    expected.statusCode = response.status if response.status
    expected.bodySchema = response.schema if response.schema

    # Backward compatible transaction name hack. Transaction names will be
    # replaced by Canonical Transaction Paths: https://github.com/apiaryio/dredd/issues/227
    unless @multiBlueprint
      transaction.name = transaction.name.replace("#{transaction.origin.apiName} > ", "")

    # Transaction skipping (can be modified in hooks). If the input format
    # is Swagger, non-2xx transactions should be skipped by default.
    skip = false
    if mediaType.indexOf('swagger') isnt -1
      status = parseInt(response.status, 10)
      if status < 200 or status >= 300
        skip = true

    configuredTransaction =
      name: transaction.name
      id: request.method + ' (' + expected.statusCode + ') ' + request.uri
      host: @parsedUrl.hostname
      port: @parsedUrl.port
      request: request
      expected: expected
      origin: origin
      fullPath: fullPath
      protocol: @parsedUrl.protocol
      skip: skip

    return configuredTransaction

  parseServerUrl: (serverUrl) ->
    unless serverUrl.match(/^https?:\/\//i)
      # Protocol is missing. Remove any : or / at the beginning of the URL
      # and prepend the URL with 'http://' (assumed as default fallback).
      serverUrl = 'http://' + serverUrl.replace(/^[:\/]*/, '')
    url.parse(serverUrl)

  getFullPath: (serverPath, requestPath) ->
    return requestPath if serverPath is '/'
    return serverPath unless requestPath

    # Join two paths
    #
    # How:
    # Removes all slashes from the beginning and from the end of each segment.
    # Then joins them together with a single slash. Then prepends the whole
    # string with a single slash.
    #
    # Why:
    # Note that 'path.join' won't work on Windows and 'url.resolve' can have
    # undesirable behavior depending on slashes.
    # See also https://github.com/joyent/node/issues/2216
    segments = [serverPath, requestPath]
    segments = (segment.replace(/^\/|\/$/g, '') for segment in segments)
    # Keep trailing slash at the end if specified in requestPath
    # and if requestPath isn't only '/'
    trailingSlash = if requestPath isnt '/' and requestPath.slice(-1) is '/' then '/' else ''
    return '/' + segments.join('/') + trailingSlash

  # Factory for 'transaction.test' object creation
  createTest: (transaction) ->
    return {
      status: ''
      title: transaction.id
      message: transaction.name
      origin: transaction.origin
      startedAt: transaction.startedAt
    }

  # Marks the transaction as failed and makes sure everything in the transaction
  # object is set accordingly. Typically this would be invoked when transaction
  # runner decides to force a transaction to behave as failed.
  failTransaction: (transaction, reason) ->
    transaction.fail = true

    @ensureTransactionResultsGeneralSection(transaction)
    transaction.results.general.results.push({severity: 'error', message: reason}) if reason

    transaction.test ?= @createTest(transaction)
    transaction.test.status = 'fail'
    transaction.test.message = reason if reason
    transaction.test.results ?= transaction.results

  # Marks the transaction as skipped and makes sure everything in the transaction
  # object is set accordingly.
  skipTransaction: (transaction, reason) ->
    transaction.skip = true

    @ensureTransactionResultsGeneralSection(transaction)
    transaction.results.general.results.push({severity: 'warning', message: reason}) if reason

    transaction.test ?= @createTest(transaction)
    transaction.test.status = 'skip'
    transaction.test.message = reason if reason
    transaction.test.results ?= transaction.results

  # Ensures that given transaction object has 'results' with 'general' section
  # where custom Gavel-like errors or warnings can be inserted.
  ensureTransactionResultsGeneralSection: (transaction) ->
    transaction.results ?= {}
    transaction.results.general ?= {}
    transaction.results.general.results ?= []

  # Inspects given transaction and emits 'test *' events with 'transaction.test'
  # according to the test's status
  emitResult: (transaction, callback) ->
    if @error or not transaction.test
      logger.debug('No emission of test data to reporters', @error, transaction.test)
      @error = null # reset the error indicator
      return callback()

    if transaction.skip
      logger.debug('Emitting to reporters: test skip')
      @configuration.emitter.emit('test skip', transaction.test, eventCallback)
      return callback()

    if transaction.test.valid
      if transaction.fail
        @failTransaction(transaction, "Failed in after hook: #{transaction.fail}")
        logger.debug('Emitting to reporters: test fail')
        @configuration.emitter.emit('test fail', transaction.test, eventCallback)
      else
        logger.debug('Emitting to reporters: test pass')
        @configuration.emitter.emit('test pass', transaction.test, eventCallback)
      return callback()

    logger.debug('Emitting to reporters: test fail')
    @configuration.emitter.emit('test fail', transaction.test, eventCallback)
    callback()

  # Emits 'test error' with given test data. Halts the transaction runner.
  emitError: (error, test) ->
    logger.debug('Emitting to reporters: test error')
    @configuration.emitter.emit('test error', error, test, eventCallback)

    # Record the error to halt the transaction runner. Do not overwrite
    # the first recorded error if more of them occured.
    @error = @error or error

  getRequestOptionsFromTransaction: (transaction) ->
    urlObject =
      protocol: transaction.protocol
      hostname: transaction.host
      port: transaction.port

    options = clone(@configuration.http or {})
    options.uri = url.format(urlObject) + transaction.fullPath
    options.method = transaction.request.method
    options.headers = transaction.request.headers
    options.body = transaction.request.body
    options.proxy = false
    options.followRedirect = false
    return options

  # This is actually doing more some pre-flight and conditional skipping of
  # the transcation based on the configuration or hooks. TODO rename
  executeTransaction: (transaction, hooks, callback) =>
    [callback, hooks] = [hooks, undefined] unless callback

    # number in miliseconds (UNIX-like timestamp * 1000 precision)
    transaction.startedAt = Date.now()

    test = @createTest(transaction)
    logger.debug('Emitting to reporters: test start')
    @configuration.emitter.emit('test start', test, eventCallback)

    @ensureTransactionResultsGeneralSection(transaction)

    if transaction.skip
      logger.verbose('HTTP transaction was marked in hooks as to be skipped. Skipping')
      transaction.test = test
      @skipTransaction(transaction, 'Skipped in before hook')
      return callback()

    else if transaction.fail
      logger.verbose('HTTP transaction was marked in hooks as to be failed. Reporting as failed')
      transaction.test = test
      @failTransaction(transaction, "Failed in before hook: #{transaction.fail}")
      return callback()

    else if @configuration.options['dry-run']
      logger.info('Dry run. Not performing HTTP request')
      transaction.test = test
      @skipTransaction(transaction)
      return callback()

    else if @configuration.options.names
      logger.info(transaction.name)
      transaction.test = test
      @skipTransaction(transaction)
      return callback()

    else if @configuration.options.method.length > 0 and not (transaction.request.method in @configuration.options.method)
      logger.info("""\
        Only #{(m.toUpperCase() for m in @configuration.options.method).join(', ')}\
        requests are set to be executed. \
        Not performing HTTP #{transaction.request.method.toUpperCase()} request.\
      """)
      transaction.test = test
      @skipTransaction(transaction)
      return callback()

    else if @configuration.options.only.length > 0 and not (transaction.name in @configuration.options.only)
      logger.info("""\
        Only '#{@configuration.options.only}' transaction is set to be executed. \
        Not performing HTTP request for '#{transaction.name}'.\
      """)
      transaction.test = test
      @skipTransaction(transaction)
      return callback()

    else
      return @performRequestAndValidate(test, transaction, hooks, callback)

  # Sets the Content-Length header. Overrides user-provided Content-Length
  # header value in case it's out of sync with the real length of the body.
  setContentLength: (transaction) ->
    headers = transaction.request.headers
    body = transaction.request.body

    contentLengthHeaderName = caseless(headers).has('Content-Length')
    if contentLengthHeaderName
      contentLengthValue = parseInt(headers[contentLengthHeaderName], 10)

      if body
        calculatedContentLengthValue = Buffer.byteLength(body)
        if contentLengthValue isnt calculatedContentLengthValue
          logger.warn("""\
            Specified Content-Length header is #{contentLengthValue}, but \
            the real body length is #{calculatedContentLengthValue}. Using \
            #{calculatedContentLengthValue} instead.\
          """)
          headers[contentLengthHeaderName] = calculatedContentLengthValue

      else if contentLengthValue isnt 0
        logger.warn("""\
          Specified Content-Length header is #{contentLengthValue}, but \
          the real body length is 0. Using 0 instead.\
        """)
        headers[contentLengthHeaderName] = 0

    else
      headers['Content-Length'] = if body then Buffer.byteLength(body) else 0

  # An actual HTTP request, before validation hooks triggering
  # and the response validation is invoked here
  performRequestAndValidate: (test, transaction, hooks, callback) ->
    if transaction.request.body and @isMultipart(transaction.request.headers)
      transaction.request.body = @fixApiBlueprintMultipartBody(transaction.request.body)

    @setContentLength(transaction)
    requestOptions = @getRequestOptionsFromTransaction(transaction)

    handleRequest = (err, res, body) =>
      if err
        logger.debug('Requesting tested server errored:', "#{err}" or err.code)
        test.title = transaction.id
        test.expected = transaction.expected
        test.request = transaction.request
        @emitError(err, test)
        return callback()

      logger.verbose('Handling HTTP response from tested server')

      # The data models as used here must conform to Gavel.js as defined in 'http-response.coffee'
      transaction.real =
        statusCode: res.statusCode
        headers: res.headers

      if body
        transaction.real.body = body
      else if transaction.expected.body
        # Leaving body as undefined skips its validation completely. In case
        # there is no real body, but there is one expected, the empty string
        # ensures Gavel does the validation.
        transaction.real.body = ''

      logger.verbose('Running \'beforeEachValidation\' hooks')
      @runHooksForData hooks?.beforeEachValidationHooks, transaction, false, =>
        return callback(@hookHandlerError) if @hookHandlerError

        logger.verbose('Running \'beforeValidation\' hooks')
        @runHooksForData hooks?.beforeValidationHooks[transaction.name], transaction, false, =>
          return callback(@hookHandlerError) if @hookHandlerError

          @validateTransaction test, transaction, callback

    try
      @performRequest(requestOptions, handleRequest)
    catch error
      logger.debug('Requesting tested server errored:', error)
      test.title = transaction.id
      test.expected = transaction.expected
      test.request = transaction.request
      @emitError(error, test)
      return callback()

  performRequest: (options, callback) ->
    protocol = options.uri.split(':')[0].toUpperCase()
    logger.verbose("""\
      About to perform an #{protocol} request to the server \
      under test: #{options.method} #{options.uri}\
    """)
    requestLib(options, callback)

  validateTransaction: (test, transaction, callback) ->
    logger.verbose('Validating HTTP transaction by Gavel.js')
    logger.debug('Determining whether HTTP transaction is valid (getting boolean verdict)')
    gavel.isValid transaction.real, transaction.expected, 'response', (isValidError, isValid) =>
      if isValidError
        logger.debug('Gavel.js validation errored:', isValidError)
        @emitError(isValidError, test)

      test.title = transaction.id
      test.actual = transaction.real
      test.expected = transaction.expected
      test.request = transaction.request

      if isValid
        test.status = 'pass'
      else
        test.status = 'fail'

      logger.debug('Validating HTTP transaction (getting verbose validation result)')
      gavel.validate transaction.real, transaction.expected, 'response', (validateError, gavelResult) =>
        if not isValidError and validateError
          logger.debug('Gavel.js validation errored:', validateError)
          @emitError(validateError, test)

        # Warn about empty responses
        if (
          ( # expected is as string, actual is as integer :facepalm:
            test.expected.statusCode?.toString() in ['204', '205'] or
            test.actual.statusCode?.toString() in ['204', '205']
          ) and (test.expected.body or test.actual.body)
        )
          logger.warn("""\
            #{test.title} HTTP 204 and 205 responses must not \
            include a message body: https://tools.ietf.org/html/rfc7231#section-6.3
          """)

        # Create test message from messages of all validation errors
        message = ''
        for own sectionName, validatorOutput of gavelResult or {} when sectionName isnt 'version'
          # Section names are 'statusCode', 'headers', 'body' (and 'version', which is irrelevant)
          for gavelError in validatorOutput.results or []
            message += "#{sectionName}: #{gavelError.message}\n"
        test.message = message

        # Record raw validation output to transaction results object
        #
        # It looks like the transaction object can already contain 'results'.
        # (Needs to be prooved, the assumption is based just on previous
        # version of the code.) In that case, we want to save the new validation
        # output, but we want to keep at least the original array of Gavel errors.
        results = transaction.results or {}
        for own sectionName, rawValidatorOutput of gavelResult when sectionName isnt 'version'
          # Section names are 'statusCode', 'headers', 'body' (and 'version', which is irrelevant)
          results[sectionName] ?= {}

          # We don't want to modify the object and we want to get rid of some
          # custom Gavel.js types ('clone' will keep just plain JS objects).
          validatorOutput = clone(rawValidatorOutput)

          # If transaction already has the 'results' object, ...
          if results[sectionName].results
            # ...then take all Gavel errors it contains and add them to the array
            # of Gavel errors in the new validator output object...
            validatorOutput.results = validatorOutput.results.concat(results[sectionName].results)
          # ...and replace the original validator object with the new one.
          results[sectionName] = validatorOutput
        transaction.results = results

        # Set the validation results and the boolean verdict to the test object
        test.results = transaction.results
        test.valid = isValid

        # Propagate test object so 'after' hooks can modify it
        transaction.test = test
        return callback()

  isMultipart: (headers) ->
    contentType = caseless(headers).get('Content-Type')
    if contentType
      contentType.indexOf('multipart') > -1
    else
      false

  # Finds newlines not preceeded by carriage returns and replaces them by
  # newlines preceeded by carriage returns.
  #
  # See https://github.com/apiaryio/api-blueprint/issues/401
  fixApiBlueprintMultipartBody: (body) ->
    body.replace(/\r?\n/g, '\r\n')


module.exports = TransactionRunner
