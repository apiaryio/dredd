uuid = require 'node-uuid'
http = require 'http'
https = require 'https'
os = require 'os'
url = require 'url'
packageConfig = require './../../package.json'
logger = require './../logger'

String::startsWith = (str) ->
  return this.slice(0, str.length) is str

class ApiaryReporter
  constructor: (emitter, stats, tests, inlineErrors) ->
    @type = "cli"
    @stats = stats
    @tests = tests
    @uuid = null
    @startedAt = null
    @endedAt = null
    @remoteId = null
    @reportUrl = null
    @configureEmitter emitter
    @inlineErrors = inlineErrors
    @errors = []
    @verbose = process.env['DREDD_REST_DEBUG']?
    @configuration =
      apiUrl: process.env['APIARY_API_URL'] || "https://api.apiary.io"
      apiToken: process.env['APIARY_API_KEY'] || null
      apiSuite: process.env['APIARY_API_NAME'] || 'public'

    logger.info 'Using apiary reporter.'

  configureEmitter: (emitter) =>
    emitter.on 'start', (blueprintsData, callback) =>
      @uuid = uuid.v4()
      @startedAt = Math.round(new Date().getTime() / 1000)

      ciVars = [/^TRAVIS/, /^CIRCLE/, /^CI/, /^DRONE/]
      envVarNames = Object.keys process.env
      ciEnvVars = {}
      for envVarName in envVarNames
        ciEnvVar = false

        for ciVar in ciVars
          if envVarName.match(ciVar) != null
            ciEnvVar = true

        if ciEnvVar == true
          ciEnvVars[envVarName] = process.env[envVarName]

      # transform blueprints data to array
      blueprints = []
      for blueprintPath, blueprintData of blueprintsData
        blueprints.push blueprintData

      data =
        blueprints: blueprints
        agent: process.env['DREDD_AGENT'] || process.env['USER']
        agentRunUuid: @uuid
        hostname: process.env['DREDD_HOSTNAME'] || os.hostname()
        startedAt: @startedAt
        public: true
        status: 'running'
        agentEnvironment: ciEnvVars

      path = '/apis/' + @configuration['apiSuite'] + '/tests/runs'

      @_performRequest path, 'POST', data, (error, response, parsedBody) =>
        if error
          logger.error error
          callback()
        else
          @remoteId = parsedBody['_id']
          @reportUrl = parsedBody['reportUrl'] if parsedBody['reportUrl']

          callback()

    emitter.on 'test pass', (test) =>
      data = @_transformTestToReporter test
      path = '/apis/' + @configuration['apiSuite'] + '/tests/steps?testRunId=' + @remoteId
      @_performRequest path, 'POST', data, (error, response, parsedBody) ->
        if error
          logger.error error

    emitter.on 'test fail', (test) =>
      data = @_transformTestToReporter test
      path = '/apis/' + @configuration['apiSuite'] + '/tests/steps?testRunId=' + @remoteId
      @_performRequest path, 'POST', data, (error, response, parsedBody) ->
        if error
          logger.error error

    emitter.on 'end', (callback) =>
      data =
        endedAt: Math.round(new Date().getTime() / 1000)
        result: @stats
        status: if (@stats['failures'] > 0 or @stats['errors'] > 0) then 'failed' else 'passed'

      path = '/apis/' + @configuration['apiSuite'] + '/tests/run/' + @remoteId

      @_performRequest path, 'PATCH', data, (error, response, parsedBody) =>
        if error
          logger.error error
        reportUrl = @reportUrl || "https://app.apiary.io/#{@configuration.apiSuite}/tests/run/#{@remoteId}"
        logger.complete "See results in Apiary at: #{reportUrl}"
        callback()

  _transformTestToReporter: (test) ->
    data =
      testRunId: @remoteId
      origin: test['origin']
      duration: test['duration']
      result: test['status']
      resultData:
        request: test['request']
        realResponse: test['actual']
        expectedResponse: test['expected']
        result: test['results']
    return data

  _performRequest: (path, method, body, callback) =>
    buffer = ""

    handleRequest = (res) =>
      res.on 'data', (chunk) =>
        if @verbose
          console.log 'REST Reporter HTTPS Response chunk: ' + chunk
        buffer = buffer + chunk

      res.on 'error', (error) =>
        if @verbose
          console.log 'REST Reporter HTTPS Response error.'
        return callback error, req, res

      res.on 'end', =>
        if @verbose
          console.log 'Rest Reporter Response ended'

        try
          parsedBody = JSON.parse buffer
        catch e
          throw new Error "Apiary reporter: Failed to JSON parse Apiary API response body: \n #{buffer}"


        if @verbose
          info =
            headers: res.headers
            statusCode: res.statusCode
            body: parsedBody
          console.log 'Rest Reporter Response:', JSON.stringify(info, null, 2)

        return callback(undefined, res, parsedBody)

    parsedUrl = url.parse @configuration['apiUrl']
    system = os.type() + ' ' + os.release() + '; ' + os.arch()

    options =
      host: parsedUrl['hostname']
      port: parsedUrl['port']
      path: path
      method: method
      headers:
        'User-Agent': "Dredd REST Reporter/" + packageConfig['version'] + " (" + system + ")"
        'Content-Type': 'application/json'

    unless @configuration['apiToken'] == null
      options.headers['Authentication'] = 'Token ' + @configuration['apiToken']

    if @verbose
      info =
        options: options
        body: body
      console.log 'Rest Reporter Request:', JSON.stringify(info, null, 2)

    if @configuration.apiUrl.startsWith 'https'
      if @verbose
        console.log 'Starting REST Reporter HTTPS Request'
      req = https.request options, handleRequest
    else
      if @verbose
        console.log 'Starting REST Reporter HTTP Response'
      req = http.request options, handleRequest

    req.write JSON.stringify body
    req.end()

module.exports = ApiaryReporter
