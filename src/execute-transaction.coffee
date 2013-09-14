cliUtils = require './cli-utils'
flattenHeaders = require './flatten-headers'
gavel = require 'gavel'
http = require 'http'
url = require 'url'
os = require 'os'
packageConfig = require './../package.json'

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
  
  cliUtils.log origin['resourceGroupName'] + \
              ' > ' + origin['resourceName'] + \
              ' > ' + origin['actionName'] + \
              ' > ' + origin['exampleName'] + \
              ':\n' + indent + options['method'] + \
              ' ' + options['path'] + \
              ' ' + JSON.stringify(request['body']).trunc(20)


  if configuration['dryRun'] == true
    cliUtils.log indent + "Dry run, skipping..."
    callback()
  else
    buffer = ""
    req = http.request options, (res) -> 
      res.on 'data', (chunk) ->
        buffer = buffer + chunk
      
      req.on 'error', (error) ->
        cliUtils.error error
        cliUtils.exit 1
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
            cliUtils.error error
            cliUtils.exit 1
            callback()
          if isValid == true
            cliUtils.log indent + "PASS"
            callback()
          else if isValid == false
            cliUtils.log indent + "FAIL"
            gavel.validate real, expected, 'response', (error, result) ->
              if error
                cliUtils.error error
                cliUtils.exit 1
              for entity, data of result
                for entityResult in data['results']
                  cliUtils.log indent + entity + ": " + entityResult['message']
                  
              cliUtils.exit 1
              callback()  

    req.write request['body'] if request['body'] != ''
    req.end()
    
module.exports = executeTransaction