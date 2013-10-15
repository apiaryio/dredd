flattenHeaders = require './flatten-headers'
gavel = require 'gavel'
http = require 'http'
url = require 'url'
os = require 'os'
packageConfig = require './../package.json'
cli = require 'cli'


indent = '  '

String.prototype.trunc = (n) ->
  if this.length>n
    return this.substr(0,n-1)+'...'
  else
    return this

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

  options =
    host: parsedUrl['hostname']
    port: parsedUrl['port']
    path: request['uri']
    method: request['method']
    headers: flatHeaders

  cli.info origin['resourceGroupName'] + \
              ' > ' + origin['resourceName'] + \
              ' > ' + origin['actionName'] + \
              ' > ' + origin['exampleName'] + \
              ':\n' + indent + options['method'] + \
              ' ' + options['path'] + \
              ' ' + JSON.stringify(request['body']).trunc(20)

  if configuration.options['dry-run']
    cli.info indent + "Dry run, skipping..."
    callback()
  else
    buffer = ""
    req = http.request options, (res) ->
      res.on 'data', (chunk) ->
        buffer = buffer + chunk

      req.on 'error', (error) ->
        cli.fatal error
        callback()

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
          if error
            cli.fatal error
            callback()

          if isValid
            for reporter in configuration.reporters
              reporter.addTest {
                status: "pass",
                title: options['method'] + ' ' + options['path']
              }
            cli.ok indent + "PASS"
            callback()
          else
            cli.error indent + "FAIL"
            gavel.validate real, expected, 'response', (error, result) ->
              if error
                cli.fatal
              for entity, data of result
                for entityResult in data['results']
                  for reporter in configuration.reporters
                    reporter.addTest {
                      status: "pass",
                      title: options['method'] + ' ' + options['path'],
                      errorMessage: entity + ": " + entityResult['message']
                    }
                  cli.info indent + entity + ": " + entityResult['message']
              callback()

    req.write request['body'] if request['body'] != ''
    req.end()

module.exports = executeTransaction
