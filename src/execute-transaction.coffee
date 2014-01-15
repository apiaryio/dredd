flattenHeaders = require './flatten-headers'
gavel = require 'gavel'
http = require 'http'
https = require 'https'
html = require 'html'
url = require 'url'
os = require 'os'
packageConfig = require './../package.json'
logger = require './logger'


indent = '  '

String::trunc = (n) ->
  if this.length>n
    return this.substr(0,n-1)+'...'
  else
    return this

String::startsWith = (str) ->
    return this.slice(0, str.length) is str

prettifyResponse = (response) ->
  parseIfJson = (obj) ->
    parsed = obj
    try
      parsed = JSON.parse obj
    catch e
      logger.debug "Error parsing as json: " + obj

    obj = parsed
    return parsed


  type = response?.headers['Content-Type'] || response?.headers['content-type']
  switch type
    when 'application/json'
      response.body = parseIfJson response.body
    when 'text/html'
      response.body = html.prettyPrint(response.body, {indent_size: 2})

  if response?.schema
    response.schema = parseIfJson response.schema

  return response

executeTransaction = (transaction, callback) ->
  configuration = transaction['configuration']
  origin = transaction['origin']
  request = transaction['request']
  response = transaction['response']

  parsedUrl = url.parse configuration['server']

  flatHeaders = flattenHeaders request['headers']

  # Add Dredd user agent if no User-Agent present
  if flatHeaders['User-Agent'] == undefined
    system = os.type() + ' ' + os.release() + '; ' + os.arch()
    flatHeaders['User-Agent'] = "Dredd/" + \
      packageConfig['version'] + \
      " ("+ system + ")"

  # Add length of body if no Content-Length present
  caseInsensitiveMap = {}
  for key, value of flatHeaders
    caseInsensitiveMap[key.toLowerCase()] = key

  if caseInsensitiveMap['content-length'] == undefined and request['body'] != ''
    flatHeaders['Content-Length'] = request['body'].length

  if configuration.options.header.length > 0
    for header in configuration.options.header
      splitHeader = header.split(':')
      flatHeaders[splitHeader[0]] = splitHeader[1]

  options =
    host: parsedUrl['hostname']
    port: parsedUrl['port']
    path: request['uri']
    method: request['method']
    headers: flatHeaders

  description = origin['resourceGroupName'] + \
              ' > ' + origin['resourceName'] + \
              ' > ' + origin['actionName'] + \
              ' > ' + origin['exampleName'] + \
              ':\n' + indent + options['method'] + \
              ' ' + options['path'] + \
              ' ' + JSON.stringify(request['body']).trunc(20)

  test =
    status: ''
    title: options['method'] + ' ' + options['path']
    message: description

  configuration.emitter.emit 'test start', test

  if configuration.options['dry-run']
    logger.info "Dry run, skipping API Tests..."
    return callback()
  else if configuration.options.method.length > 0 and not (request.method in configuration.options.method)
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
        real =
          headers: res.headers
          body: buffer
          status: res.statusCode

        expected =
          headers: flattenHeaders response['headers']
          body: response['body']
          schema: response['schema']
          status: response['status']

        gavel.isValid real, expected, 'response', (error, isValid) ->
          configuration.emitter.emit 'test error', error, test if error

          if isValid
            test.status = "pass"
            test.actual = prettifyResponse real
            test.expected = prettifyResponse expected
            test.request = options
            configuration.emitter.emit 'test pass', test
            return callback(null, req, res)
          else
            gavel.validate real, expected, 'response', (error, result) ->
              configuration.emitter.emit 'test error', error, test if error
              message = ''
              for entity, data of result
                for entityResult in data['results']
                  message += entity + ": " + entityResult['message'] + "\n"
              test =
                status: "fail",
                title: options['method'] + ' ' + options['path'],
                message: message
                actual: prettifyResponse real
                expected: prettifyResponse expected
                request: options
                start: test.start
              configuration.emitter.emit 'test fail', test
              return callback()

    if configuration.server.startsWith 'https'
      req = https.request options, handleRequest
    else
      req = http.request options, handleRequest

    req.write request['body'] if request['body'] != ''
    req.end()

module.exports = executeTransaction
