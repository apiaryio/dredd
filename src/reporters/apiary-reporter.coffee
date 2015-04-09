uuid = require 'node-uuid'
http = require 'http'
https = require 'https'
os = require 'os'
url = require 'url'
packageConfig = require './../../package.json'
logger = require './../logger'

class ApiaryReporter
  constructor: (emitter, stats, tests, config) ->
    @type = "cli"
    @stats = stats
    @tests = tests
    @uuid = null
    @startedAt = null
    @endedAt = null
    @remoteId = null
    @config = config
    console.log config
    @reportUrl = null
    @configureEmitter emitter
    @errors = []
    @verbose = @_get('dreddRestDebug', 'DREDD_REST_DEBUG', null)?
    @configuration =
      apiUrl: @_get 'apiaryApiUrl', 'APIARY_API_URL', 'https://api.apiary.io'
      apiToken: @_get 'apiaryApiKey', 'APIARY_API_KEY', null
      apiSuite: @_get 'apiaryApiName', 'APIARY_API_NAME', null

    logger.info 'Using apiary reporter.'
    if not @configuration.apiToken? and not @configuration.apiSuite?
      logger.warn "Apiary reporter environment variable APIARY_API_KEY or APIARY_API_NAME not defined."
    @configuration.apiSuite ?= 'public'


  # THIS IS HIGHWAY TO HELL! Everything should have one single interafce
  _get: (customProperty, envProperty, defaultVal) ->
    returnVal = defaultVal

    # this will be deprecated
    if @config.custom?[customProperty]?
      returnVal = @config.custom[customProperty]

    # this will be the ONLY supported way how to configure this reporter
    else if @config.options?.custom?[customProperty]?
      returnVal = @config.options.custom[customProperty]

    # this will be deprecated
    else if @config.custom?.apiaryReporterEnv?[customProperty]?
      returnVal = @config.custom.apiaryReporterEnv[customProperty]

    # this will be deprecated
    else if @config.custom?.apiaryReporterEnv?[envProperty]?
      returnVal = @config.custom.apiaryReporterEnv[envProperty]

    # this will be supported for backward compatibility, but can be removed in future.
    else if process.env[envProperty]?
      returnVal = process.env[envProperty]

    return returnVal

  _getKeys: ->
    returnKeys = []
    returnKeys = returnKeys.concat Object.keys(@config.custom?.apiaryReporterEnv or {})
    return returnKeys.concat Object.keys process.env

  configureEmitter: (emitter) =>
    emitter.on 'start', (blueprintsData, callback) =>
      @uuid = uuid.v4()
      @startedAt = Math.round(new Date().getTime() / 1000)

      # Cycle through all keys from
      # - config.custom.apiaryReporterEnv
      # - process.env keys
      ciVars = /^(TRAVIS|CIRCLE|CI|DRONE)/
      envVarNames = @_getKeys()
      ciEnvVars = {}
      for envVarName in envVarNames when envVarName.match(ciVars)?
        ciEnvVars[envVarName] = @_get envVarName, envVarName

      # transform blueprints data to array
      blueprints = []
      for blueprintPath, blueprintData of blueprintsData
        blueprints.push blueprintData

      data =
        blueprints: blueprints
        endpoint: @config.server
        agent: @_get('dreddAgent', 'DREDD_AGENT') || @_get('user', 'USER')
        agentRunUuid: @uuid
        hostname: @_get('dreddHostname', 'DREDD_HOSTNAME') || os.hostname()
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
      res.setEncoding 'utf8'

      res.on 'data', (chunk) =>
        if @verbose
          logger.log 'REST Reporter HTTPS Response chunk: ' + chunk
        buffer = buffer + chunk

      res.on 'error', (error) =>
        if @verbose
          logger.log 'REST Reporter HTTPS Response error.'
        return callback error, req, res

      res.on 'end', =>
        if @verbose
          logger.log 'Rest Reporter Response ended'

        try
          parsedBody = JSON.parse buffer
        catch e
          throw new Error("Apiary reporter: Failed to JSON parse Apiary API response body: \n #{buffer}")


        if @verbose
          info =
            headers: res.headers
            statusCode: res.statusCode
            body: parsedBody
          logger.log 'Rest Reporter Response:', JSON.stringify(info, null, 2)

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
      logger.log 'Rest Reporter Request:', JSON.stringify(info, null, 2)

    if @configuration.apiUrl?.indexOf('https') is 0
      if @verbose
        logger.log 'Starting REST Reporter HTTPS Request'
      req = https.request options, handleRequest
    else
      if @verbose
        logger.log 'Starting REST Reporter HTTP Response'
      req = http.request options, handleRequest

    req.write JSON.stringify body
    req.end()

module.exports = ApiaryReporter
