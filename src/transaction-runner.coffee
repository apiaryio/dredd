http = require 'http'
https = require 'https'
html = require 'html'
url = require 'url'
path = require 'path'
os = require 'os'
chai = require 'chai'
gavel = require 'gavel'
async = require 'async'

flattenHeaders = require './flatten-headers'
addHooks = require './add-hooks'
sortTransactions = require './sort-transactions'
packageConfig = require './../package.json'
logger = require './logger'


class TransactionRunner
  constructor: (@configuration) ->

  config: (config) ->
    @configuration = config
    @multiBlueprint = Object.keys(@configuration.data).length > 1

  run: (transactions, callback) ->
    transactions = if @configuration.options['sorted'] then sortTransactions(transactions) else transactions

    async.mapSeries transactions, @configureTransaction, (err, results) ->
      transactions = results

    hooks = addHooks @, transactions, @configuration.emitter, @configuration.custom
    @executeAllTransactions(transactions, hooks, callback)

  runHooksForTransaction: (hooksForTransaction, transaction, callback) ->
    if hooksForTransaction?
      logger.debug 'Running hooks...'

      runHookWithTransaction = (hook, callback) =>
        try
          @runHook hook, transaction, callback
        catch error
          unless error instanceof chai.AssertionError
            @emitError(transaction, error)
          else
            transaction.message = "Failed assertion in hooks: " + error.message
            transaction.test?.status = 'fail'
            @configuration.emitter.emit 'test fail', transaction.test
          callback()

      async.eachSeries hooksForTransaction, runHookWithTransaction, ->
        callback()

    else
      callback()

  emitError: (transaction, error) ->
    test =
      status: ''
      title: transaction.id
      message: transaction.name
      origin: transaction.origin
    @configuration.emitter.emit 'test error', error, test if error

  runHook: (hook, transaction, callback) ->
    if hook.length is 1
      # syncronous, no callback
      hook transaction
      callback()
    else if hook.length is 2
      # async
      hook transaction, ->
        callback()

  configureTransaction: (transaction, callback) =>
    configuration = @configuration
    origin = transaction['origin']
    request = transaction['request']
    response = transaction['response']

    parsedUrl = url.parse configuration['server']

    # joins paths regardless of slashes
    # there may be a nice way in the future: https://github.com/joyent/node/issues/2216
    # note that path.join will fail on windows, and url.resolve can have undesirable behavior depending on slashes
    if parsedUrl['path'] is "/"
      fullPath = request['uri']
    else
      fullPath = '/' + [parsedUrl['path'].replace(/^\/|\/$/g, ""), request['uri'].replace(/^\/|\/$/g, "")].join("/")

    flatHeaders = flattenHeaders request['headers']

    # Add Dredd user agent if no User-Agent present
    if not flatHeaders['User-Agent']
      system = os.type() + ' ' + os.release() + '; ' + os.arch()
      flatHeaders['User-Agent'] = "Dredd/" + \
        packageConfig['version'] + \
        " (" + system + ")"

    if configuration.options.header.length > 0
      for header in configuration.options.header
        splitIndex = header.indexOf(':')
        headerKey = header.substring(0, splitIndex)
        headerValue = header.substring(splitIndex + 1)
        flatHeaders[headerKey] = headerValue

    request['headers'] = flatHeaders

    name = ''
    name += origin['apiName'] if @multiBlueprint
    name += ' > ' if @multiBlueprint and origin['resourceGroupName']
    name += origin['resourceGroupName'] if origin['resourceGroupName']
    name += ' > ' + origin['resourceName'] if origin['resourceName']
    name += ' > ' + origin['actionName'] if origin['actionName']
    name += ' > ' + origin['exampleName'] if origin['exampleName']

    id = request['method'] + ' ' + request['uri']

    # The data models as used here must conform to Gavel.js
    # as defined in `http-response.coffee`
    expected =
      headers: flattenHeaders response['headers']
      body: response['body']
      statusCode: response['status']
    expected['bodySchema'] = response['schema'] if response['schema']

    configuredTransaction =
      name: name
      id: id
      host: parsedUrl['hostname']
      port: parsedUrl['port']
      request: request
      expected: expected
      origin: origin
      fullPath: fullPath
      protocol: parsedUrl.protocol
      skip: false

    return callback(null, configuredTransaction)

  emitResult: (transaction, callback) ->
    if transaction.test # if transaction test was executed and was not skipped or failed
      if transaction.test.valid == true
        if transaction.fail
          transaction.test.status = 'fail'
          transaction.test.message = "Failed in after hook: " + transaction.fail
          @configuration.emitter.emit 'test fail', transaction.test
        else
          @configuration.emitter.emit 'test pass', transaction.test
    callback()

  executeAllTransactions: (transactions, hooks, callback) =>
    hooks.transactions = transactions

    # run beforeAll hooks
    hooks.runBeforeAll () =>

      # iterate over transactions transaction
      async.eachSeries transactions, (transaction, iterationCallback) =>

        # run before hooks
        @runHooksForTransaction hooks.beforeHooks[transaction.name], transaction, () =>

          # execute and validate HTTP transaction
          @executeTransaction transaction, () =>

            # run after hooks
            @runHooksForTransaction hooks.afterHooks[transaction.name], transaction, () =>

              # decide and emit result
              @emitResult transaction, iterationCallback
      , () ->

        #runAfterHooks
        hooks.runAfterAll(callback)

  executeTransaction: (transaction, callback) =>
    configuration = @configuration

    # Add length of body if no Content-Length present
    # Doing here instead of in configureTransaction, because request body can be edited in before hook

    caseInsensitiveRequestHeadersMap = {}
    for key, value of transaction.request.headers
      caseInsensitiveRequestHeadersMap[key.toLowerCase()] = key

    if not caseInsensitiveRequestHeadersMap['content-length'] and transaction.request['body'] != ''
      transaction.request.headers['Content-Length'] = Buffer.byteLength(transaction.request['body'], 'utf8')

    requestOptions =
      host: transaction.host
      port: transaction.port
      path: transaction.fullPath
      method: transaction.request['method']
      headers: transaction.request.headers

    test =
      status: ''
      title: transaction.id
      message: transaction.name
      origin: transaction.origin

    configuration.emitter.emit 'test start', test

    if transaction.skip
      # manually set to skip a test in hooks
      configuration.emitter.emit 'test skip', test
      return callback()
    else if transaction.fail
      # manually set to skip a test in hooks
      test.message = "Failed in before hook: " + transaction.fail
      configuration.emitter.emit 'test fail', test
      return callback()
    else if configuration.options['dry-run']
      logger.info "Dry run, skipping API Tests..."
      transaction.skip = true
      return callback()
    else if configuration.options.names
      logger.info transaction.name
      transaction.skip = true
      return callback()
    else if configuration.options.method.length > 0 and not (transaction.request.method in configuration.options.method)
      configuration.emitter.emit 'test skip', test
      transaction.skip = true
      return callback()
    else if configuration.options.only.length > 0 and not (transaction.name in configuration.options.only)
      configuration.emitter.emit 'test skip', test
      transaction.skip = true
      return callback()
    else if transaction.skip
      # manually set to skip a test
      configuration.emitter.emit 'test skip', test
      return callback()
    else
      buffer = ""

      handleRequest = (res) ->
        res.on 'data', (chunk) ->
          buffer = buffer + chunk

        req.on 'error', (error) ->
          configuration.emitter.emit 'test error', error, test if error

        res.on 'end', ->

          # The data models as used here must conform to Gavel.js
          # as defined in `http-response.coffee`
          real =
            statusCode: res.statusCode
            headers: res.headers
            body: buffer

          transaction['real'] = real

          gavel.isValid real, transaction.expected, 'response', (isValidError, isValid) ->
            configuration.emitter.emit 'test error', isValidError, test if isValidError

            test.start = test.start
            test.title = transaction.id
            test.actual = real
            test.expected = transaction.expected
            test.request = transaction.request

            if isValid
              test.status = "pass"
            else
              test.status = "fail"

            gavel.validate real, transaction.expected, 'response', (validateError, result) ->
              if not isValidError and validateError
                configuration.emitter.emit 'test error', validateError, test

              message = ''

              for resultKey, data of result
                if resultKey isnt 'version'
                  for entityResult in data['results']
                    message += resultKey + ": " + entityResult['message'] + "\n"

              test.message = message
              test.results = result
              test.valid = isValid

              # propagate test to after hooks
              transaction.test = test

              if test.valid == false
                configuration.emitter.emit 'test fail', test

              return callback()

      transport = if transaction.protocol is 'https:' then https else http
      if transaction.request['body'] and @isMultipart requestOptions
        @replaceLineFeedInBody transaction, requestOptions

      try
        req = transport.request requestOptions, handleRequest
        req.write transaction.request['body'] if transaction.request['body'] != ''
        req.end()
      catch error
        configuration.emitter.emit 'test error', error, test if error
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
