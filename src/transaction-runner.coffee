http = require 'http'
https = require 'https'
url = require 'url'
path = require 'path'
os = require 'os'
chai = require 'chai'
gavel = require 'gavel'
async = require 'async'
clone = require 'clone'
{Pitboss} = require 'pitboss-ng'

flattenHeaders = require './flatten-headers'
addHooks = require './add-hooks'
sortTransactions = require './sort-transactions'
packageData = require './../package.json'
logger = require './logger'


# use "lib" folder, because pitboss-ng does not support "coffee-script:register"
# out of the box now
sandboxedLogLibraryPath = '../../../lib/hooks-log-sandboxed'

class TransactionRunner
  constructor: (@configuration) ->
    @logs = []
    @hookStash = {}
    @hookHandlerError = null

  config: (config) ->
    @configuration = config
    @multiBlueprint = Object.keys(@configuration.data).length > 1

  run: (transactions, callback) ->
    logger.verbose('Sorting HTTP transactions.')
    transactions = if @configuration.options['sorted'] then sortTransactions(transactions) else transactions

    logger.verbose('Configuring HTTP transactions.')
    async.mapSeries transactions, @configureTransaction.bind(@), (err, results) =>
      transactions = results

      # Remainings of functional approach, probs to be eradicated
      logger.verbose('Reading hook files and registering hooks.')
      addHooks @, transactions, (addHooksError) =>
        return callback addHooksError if addHooksError

        logger.verbose('Executing HTTP transactions.')
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

    logger.verbose('Running \'beforeAll\' hooks.')
    @runHooksForData hooks.beforeAllHooks, transactions, true, =>
      return callback(@hookHandlerError) if @hookHandlerError

      # Iterate over transactions' transaction
      # Because async changes the way referencing of properties work,
      # we need to work with indexes (keys) here, no other way of access.
      async.timesSeries transactions.length, (transactionIndex, iterationCallback) =>
        transaction = transactions[transactionIndex]
        logger.verbose("Processing transaction ##{transactionIndex}:", transaction.name)

        logger.verbose('Running \'beforeEach\' hooks.')
        @runHooksForData hooks.beforeEachHooks, transaction, false, =>
          return iterationCallback(@hookHandlerError) if @hookHandlerError

          logger.verbose('Running \'before\' hooks.')
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

              logger.verbose('Running \'afterEach\' hooks.')
              @runHooksForData hooks.afterEachHooks, transaction, false, =>
                return iterationCallback(@hookHandlerError) if @hookHandlerError

                logger.verbose('Running \'after\' hooks.')
                @runHooksForData hooks.afterHooks[transaction.name], transaction, false, =>
                  return iterationCallback(@hookHandlerError) if @hookHandlerError

                  logger.debug("Evaluating results of transaction execution ##{transactionIndex}:", transaction.name)
                  @emitResult transaction, iterationCallback

      , (iterationError) =>
        return callback(iterationError) if iterationError

        logger.verbose('Running \'afterAll\' hooks.')
        @runHooksForData hooks.afterAllHooks, transactions, true, =>
          return callback(@hookHandlerError) if @hookHandlerError
          callback()

  # Tha `data` argument can be transactions or transaction object
  runHooksForData: (hooks, data, legacy = false, callback) ->
    if hooks? and Array.isArray hooks
      logger.debug 'Running hooks...'

      runHookWithData = (hookFnIndex, runHookCallback) =>
        hookFn = hooks[hookFnIndex]
        try
          if legacy
            # Legacy mode is only for running beforeAll and afterAll hooks with
            # old API, i.e. callback as a first argument

            @runLegacyHook hookFn, data, (err) =>
              if err
                error = new Error(err)
                @emitError(data, error)
              runHookCallback()
          else
            @runHook hookFn, data, (err) =>
              if err
                error = new Error(err)
                @emitError(data, error)
              runHookCallback()

        catch error
          # Beware! This is very problematic part of code. This try/catch block
          # catches also errors thrown in 'runHookCallback', i.e. in all
          # subsequent flow! Then also 'callback' is called twice and
          # all the flow can be executed twice. We need to reimplement this.

          if error instanceof chai.AssertionError
            message = "Failed assertion in hooks: " + error.message

            data['results'] ?= {}
            data['results']['general'] ?= {}
            data['results']['general']['results'] ?= []
            data['results']['general']['results'].push { severity: 'error', message: message }

            data['message'] = message

            data['test'] ?= {}
            data['test']['status'] = 'fail'

            data['test']['results'] ?= {}

            for key, value of data['results']
              if key != 'version'
                data['test']['results'][key] ?= {}
                data['test']['results'][key]['results'] ?= []
                data['test']['results'][key]['results'] =
                  data['test']['results'][key]['results'].concat value

            @configuration.emitter.emit 'test fail', data.test
          else
            @emitError(data, error)

          runHookCallback()

      async.timesSeries hooks.length, runHookWithData, ->
        callback()

    else
      callback()

  emitError: (transaction, error) ->
    logger.debug('Transaction runner is emitting an error:', transaction.name, error)
    # TODO investigate how event handler looks like, because it couldn't be able
    # to handle transactions instead of transaction
    test =
      status: ''
      title: transaction.id
      message: transaction.name
      origin: transaction.origin
      startedAt: transaction.startedAt # number in ms (UNIX timestamp * 1000 precision)
      request: transaction.request
    @configuration.emitter.emit 'test error', error, test if error

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
      output;
    """

  runSandboxedHookFromString: (hookString, data, callback) ->
    wrappedCode = @sandboxedWrappedCode hookString

    sandbox = new Pitboss(wrappedCode, {
      timeout: 500
    })

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

  configureTransaction: (transaction, callback) =>
    configuration = @configuration

    {origin, request, response} = transaction
    mediaType = configuration.data[origin.filename]?.mediaType or 'text/vnd.apiblueprint'

    # Parse the server URL (just once, caching it in @parsedUrl)
    @parsedUrl ?= @parseServerUrl(configuration.server)
    fullPath = @getFullPath(@parsedUrl.path, request.uri)

    flatHeaders = flattenHeaders(request['headers'])

    # Add Dredd User-Agent (if no User-Agent is already present)
    if not flatHeaders['User-Agent']
      system = os.type() + ' ' + os.release() + '; ' + os.arch()
      flatHeaders['User-Agent'] = "Dredd/" + \
        packageData.version + " (" + system + ")"

    # Parse and add headers from the config to the transaction
    if configuration.options.header.length > 0
      for header in configuration.options.header
        splitIndex = header.indexOf(':')
        headerKey = header.substring(0, splitIndex)
        headerValue = header.substring(splitIndex + 1)
        flatHeaders[headerKey] = headerValue
    request['headers'] = flatHeaders

    # The data models as used here must conform to Gavel.js
    # as defined in `http-response.coffee`
    expected =
      headers: flattenHeaders response['headers']
      body: response['body']
      statusCode: response['status']
    expected['bodySchema'] = response['schema'] if response['schema']

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
      id: request.method + ' ' + request.uri
      host: @parsedUrl.hostname
      port: @parsedUrl.port
      request: request
      expected: expected
      origin: origin
      fullPath: fullPath
      protocol: @parsedUrl.protocol
      skip: skip

    return callback(null, configuredTransaction)

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
    return '/' + segments.join('/')

  emitResult: (transaction, callback) ->
    # if transaction test was executed and was not skipped or failed
    if transaction.test
      if transaction.test.valid == true

        # If the transaction is set programatically to fail by user in hooks
        if transaction.fail
          transaction.test.status = 'fail'

          message = "Failed in after hook: " + transaction.fail
          transaction.test.message = message

          transaction['results'] ?= {}
          transaction['results']['general'] ?= []
          transaction['results']['general']['results'] ?= []
          transaction['results']['general']['results'].push {severity: 'error', message: message}

          transaction['test'] ?= {}
          transaction['test']['results'] ?= {}

          for key, value of transaction['results']
            if key != 'version'
              transaction['test']['results'][key] ?= {}
              transaction['test']['results'][key]['results'] ?= []
              transaction['test']['results'][key]['results'] =
                transaction['test']['results'][key]['results'].concat(value)

          @configuration.emitter.emit 'test fail', transaction.test, () ->
        else
          @configuration.emitter.emit 'test pass', transaction.test, () ->
    callback()

  getRequestOptionsFromTransaction: (transaction) ->
    requestOptions =
      host: transaction.host
      port: transaction.port
      path: transaction.fullPath
      method: transaction.request['method']
      headers: transaction.request.headers
    return requestOptions

  # Add length of body if no Content-Length present
  setContentLength: (transaction) ->
    caseInsensitiveRequestHeadersMap = {}
    for key, value of transaction.request.headers
      caseInsensitiveRequestHeadersMap[key.toLowerCase()] = key

    if not caseInsensitiveRequestHeadersMap['content-length'] and transaction.request['body'] != ''
      logger.verbose('Calculating Content-Length of the request body.')
      transaction.request.headers['Content-Length'] = Buffer.byteLength(transaction.request['body'], 'utf8')

  # This is actually doing more some pre-flight and conditional skipping of
  # the transcation based on the configuration or hooks. TODO rename
  executeTransaction: (transaction, hooks, callback) =>
    unless callback
      callback = hooks
      hooks = null

    # Doing here instead of in configureTransaction, because request body can
    # be edited in the 'before' hook
    @setContentLength(transaction)

    # number in miliseconds (UNIX-like timestamp * 1000 precision)
    transaction.startedAt = Date.now()

    test =
      status: ''
      title: transaction.id
      message: transaction.name
      origin: transaction.origin
      startedAt: transaction.startedAt

    @configuration.emitter.emit 'test start', test, () ->

    transaction['results'] ?= {}
    transaction['results']['general'] ?= {}
    transaction['results']['general']['results'] ?= []

    if transaction.skip
      # manually set to skip a test (can be done in hooks too)
      logger.verbose('HTTP transaction was marked in hooks as to be skipped. Skipping.')

      message = "Skipped in before hook"
      transaction['results']['general']['results'].push {severity: "warning", message: message}

      test['results'] = transaction['results']
      test['status'] = 'skip'

      @configuration.emitter.emit 'test skip', test, () ->
      return callback()

    else if transaction.fail
      # manually set to fail a test in hooks
      logger.verbose('HTTP transaction was marked in hooks as to be failed. Reporting as failed.')

      message = "Failed in before hook: " + transaction.fail
      transaction['results']['general']['results'].push {severity: 'error', message: message}

      test['message'] = message
      test['status'] = 'fail'

      test['results'] = transaction['results']

      @configuration.emitter.emit 'test fail', test, () ->
      return callback()
    else if @configuration.options['dry-run']
      logger.info('Dry run. Not performing HTTP request.')
      transaction.skip = true
      return callback()
    else if @configuration.options.names
      logger.info(transaction.name)
      transaction.skip = true
      return callback()
    else if @configuration.options.method.length > 0 and not (transaction.request.method in @configuration.options.method)
      logger.info("""\
        Only #{(m.toUpperCase() for m in @configuration.options.method).join(', ')}\
        requests are set to be executed. \
        Not performing HTTP #{transaction.request.method.toUpperCase()} request.\
      """)
      @configuration.emitter.emit 'test skip', test, () ->
      transaction.skip = true
      return callback()
    else if @configuration.options.only.length > 0 and not (transaction.name in @configuration.options.only)
      logger.info("""\
        Only '#{@configuration.options.only}' transaction is set to be executed. \
        Not performing HTTP request for '#{transaction.name}'.\
      """)
      @configuration.emitter.emit 'test skip', test, () ->
      transaction.skip = true
      return callback()
    else
      return @performRequestAndValidate(test, transaction, hooks, callback)

  # An actual HTTP request, before validation hooks triggering
  # and the response validation is invoked here
  performRequestAndValidate: (test, transaction, hooks, callback) ->
    requestOptions = @getRequestOptionsFromTransaction(transaction)
    buffer = ""

    handleRequest = (res) =>
      logger.verbose('Handling HTTP response from tested server.')

      res.on 'data', (chunk) ->
        logger.debug('Recieving some data from tested server.')
        buffer += chunk

      res.on 'error', (error) =>
        logger.debug('Recieving response from tested server errored:', error)
        if error
          test.title = transaction.id
          test.expected = transaction.expected
          test.request = transaction.request
          @configuration.emitter.emit 'test error', error, test, () ->

        return callback()

      res.once 'end', =>
        logger.debug('Response from tested server was recieved.')

        # The data models as used here must conform to Gavel.js
        # as defined in `http-response.coffee`
        real =
          statusCode: res.statusCode
          headers: res.headers
          body: buffer

        transaction['real'] = real

        logger.verbose('Running \'beforeEachValidation\' hooks.')
        @runHooksForData hooks?.beforeEachValidationHooks, transaction, false, () =>
          return callback(@hookHandlerError) if @hookHandlerError

          logger.verbose('Running \'beforeValidation\' hooks.')
          @runHooksForData hooks?.beforeValidationHooks[transaction.name], transaction, false, () =>
            return callback(@hookHandlerError) if @hookHandlerError

            @validateTransaction test, transaction, callback


    transport = if transaction.protocol is 'https:' then https else http
    if transaction.request['body'] and @isMultipart requestOptions
      @replaceLineFeedInBody transaction, requestOptions

    try
      logger.verbose('About to perform an HTTP request to tested server.')
      req = transport.request requestOptions, handleRequest

      req.on 'error', (error) =>
        logger.debug('Requesting tested server errored:', error)
        test.title = transaction.id
        test.expected = transaction.expected
        test.request = transaction.request
        @configuration.emitter.emit 'test error', error, test, () ->
        return callback()

      req.write(transaction.request.body) if transaction.request.body
      req.end()
    catch error
      logger.debug('Requesting tested server errored:', error)
      test.title = transaction.id
      test.expected = transaction.expected
      test.request = transaction.request
      @configuration.emitter.emit 'test error', error, test, () ->
      return callback()

  validateTransaction: (test, transaction, callback) ->
    configuration = @configuration

    logger.verbose('Validating HTTP transaction by Gavel.js.')
    logger.debug('Determining whether HTTP transaction is valid (getting boolean verdict).')
    gavel.isValid transaction.real, transaction.expected, 'response', (isValidError, isValid) ->
      if isValidError
        logger.debug('Gavel.js errored:', isValidError)
        configuration.emitter.emit 'test error', isValidError, test, () ->

      test.start = test.start
      test.title = transaction.id
      test.actual = transaction.real
      test.expected = transaction.expected
      test.request = transaction.request

      if isValid
        test.status = "pass"
      else
        test.status = "fail"

      logger.debug('Validating HTTP transaction (getting verbose validation result).')
      gavel.validate transaction.real, transaction.expected, 'response', (validateError, gavelResult) ->
        if not isValidError and validateError
          logger.debug('Gavel.js errored:', validateError)
          configuration.emitter.emit 'test error', validateError, test, () ->

        message = ''

        for own resultKey, data of gavelResult or {}
          if resultKey isnt 'version'
            for entityResult in data['results'] or []
              message += resultKey + ": " + entityResult['message'] + "\n"

        test['message'] = message

        transaction['results'] ?= {}

        for own key, value of gavelResult or {}
          beforeResults = null
          if transaction['results'][key]?['results']?
            beforeResults = clone transaction['results'][key]['results']

          transaction['results'][key] = value

          if beforeResults?
            transaction['results'][key]['results'] = transaction['results'][key]['results'].concat beforeResults

        test['results'] = transaction['results']

        test['valid'] = isValid

        # propagate test to after hooks
        transaction['test'] = test

        if test['valid'] == false
          configuration.emitter.emit 'test fail', test, () ->

        return callback()

  isMultipart: (requestOptions) ->
    caseInsensitiveRequestHeaders = {}
    for key, value of requestOptions.headers
      caseInsensitiveRequestHeaders[key.toLowerCase()] = value
    caseInsensitiveRequestHeaders['content-type']?.indexOf("multipart") > -1

  replaceLineFeedInBody: (transaction, requestOptions) ->
    if transaction.request['body'].indexOf('\r\n') == -1
      transaction.request['body'] = transaction.request['body'].replace(/\n/g, '\r\n')
      transaction.request['headers']['Content-Length'] = Buffer.byteLength(transaction.request['body'], 'utf8')
      requestOptions.headers = transaction.request['headers']


module.exports = TransactionRunner
