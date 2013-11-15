http = require 'http'
https = require 'https'
logger = require './logger'
Reporter = require './reporter'
url = require 'url'
os = require 'os'
packageConfig = require './../package.json'

String::startsWith = (str) ->
    return this.slice(0, str.length) is str

verbose = process.env['DREDD_REST_DEBUG']?

class RestReporter extends Reporter

  constructor: (configuration) ->
    super()

    @type = "rest"
    
    error = new Error 'Configuration should have \'restReporter\' key under \'options\''
    thorw error unless configuration.options.restReporter

    @configuration = configuration.options.restReporter


  start: (opts, callback) =>
    super opts, (error) ->
      return callback(error) if error 
    
    path = '/apis/' + @configuration['suite'] + '/tests/runs'

    data =
      blueprint: opts['rawBlueprint']
      agent: process.env['DREDD_AGENT'] || process.env['USER']
      agentRunUuid: @uuid
      hostname: process.env['DREDD_HOSTNAME'] || os.hostname()
      startedAt: @startedAt
      public: true
      status: 'running'

      ci: process.env['CI']?
      
    if process.env['CI']
      data['ciData'] =
        name: process.env['CI_BUILD_NAME'] 
        buildId: process.env['CI_BUILD_ID']
        buildNumber: process.env['CI_BUILD_NUMBER']
        jobId: process.env['CI_JOB_ID']
        jobNumber: process.env['CI_JOB_NUMBER']

    @_performRequest path, 'POST', data, (error, response, parsedBody) =>
      if error
        return callback(error)
      else 
        @remoteId = parsedBody['_id']
        return callback()

  addTest: (test, callback) =>
    super test, (error) ->
      return callback(error) if error
    
    path = '/apis/' + @configuration['suite'] + '/tests/steps?testRunId=' + @remoteId
    
    data = 
      testRunId: @remoteId
      origin: test['origin']
      duration: test['duration']
      result: test['status']
      stepType: 'exampleTransaction'
      resultData:
        request: test['request']
        realResponse: test['actual']
        expectedResponse: test['expected']
        result: test['result']

    @_performRequest path, 'POST', data, (error, response, parsedBody) ->
      if error 
        return callback(error)
      else
        test['remoteId'] = parsedBody['_id']
        return callback()
      
  createReport: (callback) =>
    super (error) ->
      return callback(error) if error
    data =
      endedAt: @endedAt
      status: if @booleanResult then 'passed' else 'failed'
      result: @stats
    
    path = '/apis/' + @configuration['suite'] + '/tests/run/' + @remoteId

    @_performRequest path, 'PATCH', data, (error, response, parsedBody) ->
      if error
        return callback(error) 
      else
        return callback()


  _performRequest: (path, method, body, callback) =>
    buffer = ""
    
    handleRequest = (res) ->
      res.on 'data', (chunk) ->
        buffer = buffer + chunk
  
      req.on 'error', (error) ->
        return callback error, req, res

      res.on 'end', () =>
        parsedBody = JSON.parse buffer        

        if verbose
          info = 
            headers: res.headers
            statusCode: res.statusCode
            body: parsedBody     

          logger.info 'Dredd Rest Reporter Response:', JSON.stringify(info, null, 2)

        return callback(undefined, res, parsedBody)
    
    parsedUrl = url.parse @configuration['apiUrl']
    system = os.type() + ' ' + os.release() + '; ' + os.arch()

    options =
      host: parsedUrl['hostname']
      port: parsedUrl['port']
      path: path
      method: method
      headers:
        'Authentication': 'Token ' + @configuration['apiToken']
        'User-Agent': "Dredd REST Reporter/" + packageConfig['version'] + " ("+ system + ")"

    if verbose
      info =
        options: options
        body: body

      logger.info 'Dredd Rest Reporter Request:', JSON.stringify(info, null, 2)

    if @configuration.apiUrl.startsWith 'https'
      req = https.request options, handleRequest
    else
      req = http.request options, handleRequest
    
    req.write JSON.stringify body
    req.end()    

module.exports = RestReporter
