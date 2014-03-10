http = require 'http'
https = require 'https'
html = require 'html'
url = require 'url'
path = require 'path'
os = require 'os'

gavel = require 'gavel'
advisable = require 'advisable'
async = require 'async'

flattenHeaders = require './flatten-headers'
addHooks = require './add-hooks'
sortTransactions = require './sort-transactions'
packageConfig = require './../package.json'
logger = require './logger'


String::startsWith = (str) ->
    return this.slice(0, str.length) is str

class TransactionRunner
  constructor: (@configuration) ->
    advisable.async.call TransactionRunner.prototype
    addHooks @, {}

  run: (transactions, callback) ->
    transactions = if @configuration.options['sorted'] then sortTransactions(transactions) else transactions

    async.mapSeries transactions, @configureTransaction, (err, results) ->
      transactions = results

    addHooks {}, transactions

    async.eachSeries transactions, @executeTransaction, () ->
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
      fullPath = '/' + [parsedUrl['path'].replace(/^\/|\/$/g,""), request['uri'].replace(/^\/|\/$/g,"")].join("/")

    flatHeaders = flattenHeaders request['headers']

    # Add Dredd user agent if no User-Agent present
    if not flatHeaders['User-Agent']
      system = os.type() + ' ' + os.release() + '; ' + os.arch()
      flatHeaders['User-Agent'] = "Dredd/" + \
        packageConfig['version'] + \
        " ("+ system + ")"

    # Add length of body if no Content-Length present
    caseInsensitiveMap = {}
    for key, value of flatHeaders
      caseInsensitiveMap[key.toLowerCase()] = key

    if not caseInsensitiveMap['content-length'] and request['body'] != ''
      flatHeaders['Content-Length'] = request['body'].length

    if configuration.options.header.length > 0
      for header in configuration.options.header
        splitHeader = header.split(':')
        flatHeaders[splitHeader[0]] = splitHeader[1]

    request['headers'] = flatHeaders

    name = ''
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

    return callback(null, configuredTransaction)

  executeTransaction: (transaction, callback) =>
    configuration = @configuration

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

    if configuration.options.names
      logger.info transaction.name
      return callback()

    configuration.emitter.emit 'test start', test

    if configuration.options['dry-run']
      logger.info "Dry run, skipping API Tests..."
      return callback()
    else if configuration.options.method.length > 0 and not (transaction.request.method in configuration.options.method)
      configuration.emitter.emit 'test skip', test
      return callback()
    else
      buffer = ""

      handleRequest = (res) ->
        res.on 'data', (chunk) ->
          buffer = buffer + chunk

        req.on 'error', (error) ->
          configuration.emitter.emit 'test error', error, test if error

        res.on 'end', () ->

          # The data models as used here must conform to Gavel.js
          # as defined in `http-response.coffee`
          real =
            statusCode: res.statusCode
            headers: res.headers
            body: buffer

          transaction['real'] = real

          gavel.isValid real, transaction.expected, 'response', (error, isValid) ->
            configuration.emitter.emit 'test error', error, test if error

            if isValid
              test.status = "pass"
              test.actual = real
              test.expected = transaction.expected
              test.request = transaction.request
              configuration.emitter.emit 'test pass', test
              return callback()
            else
              gavel.validate real, transaction.expected, 'response', (error, result) ->
                configuration.emitter.emit 'test error', error, test if error
                message = ''
                for entity, data of result
                  for entityResult in data['results']
                    message += entity + ": " + entityResult['message'] + "\n"
                test =
                  status: "fail",
                  title: transaction.id,
                  message: message
                  actual: real
                  expected: transaction.expected
                  request: transaction.request
                  start: test.start
                configuration.emitter.emit 'test fail', test
                return callback()

      if configuration.server.startsWith 'https'
        req = https.request requestOptions, handleRequest
      else
        req = http.request requestOptions, handleRequest

      req.write transaction.request['body'] if transaction.request['body'] != ''
      req.end()

module.exports = TransactionRunner
