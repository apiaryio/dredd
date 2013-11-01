flattenHeaders = require './flatten-headers'
gavel = require 'gavel'
http = require 'http'
https = require 'https'
html = require 'html'
url = require 'url'
os = require 'os'
packageConfig = require './../package.json'
cli = require 'cli'


indent = '  '

String::trunc = (n) ->
  if this.length>n
    return this.substr(0,n-1)+'...'
  else
    return this

String::startsWith = (str) ->
    return this.slice(0, str.length) is str

prettify = (transaction) ->
  type = transaction?.headers['Content-Type'] || transaction?.headers['content-type']
  switch type
    when 'application/json'
      try
        parsed = JSON.parse transaction.body
      catch e
        cli.error "Error parsing body as json: " + transaction.body
        parsed = transaction.body
      transaction.body = parsed
    when 'text/html'
      transaction.body = html.prettyPrint(transaction.body, {indent_size: 2})
  return transaction

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

  if configuration.request?.headers?
    for header, value of configuration['request']['headers']
      flatHeaders[header] = value

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

  if configuration.options['dry-run']
    cli.info "Dry run, skipping..."
    return callback()
  else
    buffer = ""

    handleRequest = (res) ->
      res.on 'data', (chunk) ->
        buffer = buffer + chunk

      req.on 'error', (error) ->
        return callback error, req, res

      res.on 'end', () ->
        real =
          headers: res.headers
          body: buffer
          status: res.statusCode

        expected =
          headers: flattenHeaders response['headers']
          body: response['body']
          bodySchema: response['schema']
          statusCode: response['status']

        gavel.isValid real, expected, 'response', (error, isValid) ->
          return callback error, req, res if error

          if isValid
            test =
              status: "pass",
              title: options['method'] + ' ' + options['path']
              message: description
            configuration.reporter.addTest test, (error) ->
              return callback error, req, res if error
            return callback(undefined, req, res)
          else
            gavel.validate real, expected, 'response', (error, result) ->
              return callback(error, req, res) if error
              message = ''
              for entity, data of result
                for entityResult in data['results']
                  message += entity + ": " + entityResult['message'] + "\n"
              test =
                status: "fail",
                title: options['method'] + ' ' + options['path'],
                message: message
                actual: prettify real
                expected: prettify expected
                request: options
              configuration.reporter.addTest test, (error) ->
                return callback error, req, res if error
              return callback(undefined, req, res)

    if configuration.server.startsWith 'https'
      req = https.request options, handleRequest
    else
      req = http.request options, handleRequest

    req.write request['body'] if request['body'] != ''
    req.end()

module.exports = executeTransaction
