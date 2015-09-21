http = require 'http'
https = require 'https'
os = require 'os'
url = require 'url'

clone = require 'clone'
uuid = require 'node-uuid'

packageConfig = require './../../package.json'
logger = require './../logger'

CONNECTION_ERRORS = ['ECONNRESET', 'ENOTFOUND', 'ESOCKETTIMEDOUT', 'ETIMEDOUT', 'ECONNREFUSED', 'EHOSTUNREACH', 'EPIPE']

class ApiaryReporter
  constructor: (emitter, stats, tests, config, runner) ->
    @type = "cli"
    @stats = stats
    @tests = tests
    @uuid = null
    @startedAt = null
    @endedAt = null
    @remoteId = null
    @config = config
    @runner = runner
    @reportUrl = null
    @configureEmitter emitter
    @errors = []
    @verbose = @_get('dreddRestDebug', 'DREDD_REST_DEBUG', null)?
    @serverError = false
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
      return callback() if @serverError == true
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
        blueprints.push @_limitBlueprintDataToSend blueprintData

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

      if @configuration['apiToken']? and @configuration['apiSuite']?
        data.public = false

      path = '/apis/' + @configuration['apiSuite'] + '/tests/runs'

      @_performRequestAsync path, 'POST', data, (error, response, parsedBody) =>
        if error
          return callback(error)
        else
          @remoteId = parsedBody['_id']
          @reportUrl = parsedBody['reportUrl'] if parsedBody['reportUrl']
          callback()

    _createStep = (test, callback) =>
      return callback() if @serverError == true
      data = @_transformTestToReporter test
      path = '/apis/' + @configuration['apiSuite'] + '/tests/steps?testRunId=' + @remoteId
      @_performRequestAsync path, 'POST', data, (error, response, parsedBody) ->
        return callback(error) if error
        callback()

    emitter.on 'test pass', _createStep

    emitter.on 'test fail', _createStep

    emitter.on 'test skip', _createStep

    emitter.on 'test error', (test, error, callback) =>
      return callback() if @serverError == true
      data = @_transformTestToReporter test
      data.result = 'error'

      data['resultData']['result']['general'] ?= []

      if CONNECTION_ERRORS.indexOf(error.code) > -1
        data['resultData']['result']['general'].push {
          severity: 'error', message: "Error connecting to server under test!"
        }
      else
        data['resultData']['result']['general'].push {
          severity: 'error', message: "Unhandled error occured when executing the transaction."
        }

      path = '/apis/' + @configuration['apiSuite'] + '/tests/steps?testRunId=' + @remoteId
      @_performRequestAsync path, 'POST', data, (error, response, parsedBody) ->
        return callback(error) if error
        callback()

    emitter.on 'end', (callback) =>
      return callback() if @serverError == true
      data =
        endedAt: Math.round(new Date().getTime() / 1000)
        result: @stats
        status: if (@stats['failures'] > 0 or @stats['errors'] > 0) then 'failed' else 'passed'
        logs: @runner.logs if @runner?.logs?.length

      path = '/apis/' + @configuration['apiSuite'] + '/tests/run/' + @remoteId

      @_performRequestAsync path, 'PATCH', data, (error, response, parsedBody) =>
        return callback(error) if error
        reportUrl = @reportUrl || "https://app.apiary.io/#{@configuration.apiSuite}/tests/run/#{@remoteId}"
        logger.complete "See results in Apiary at: #{reportUrl}"
        callback()

  _limitBlueprintDataToSend: (blueprintData = {}) ->
    # {raw, filename, parsed} = blueprintData
    returnedData = {}

    returnedData.raw = blueprintData.raw
    returnedData.filename = blueprintData.filename

    returnedData.parsed =
      # omit parsed.ast, it might change in future (depends heavily on protagonist/drafter versions)
      _version: blueprintData.parsed._version
      warnings: clone blueprintData.parsed.warnings
      error: blueprintData.parsed.error
    return returnedData

  _transformTestToReporter: (test) ->
    data =
      testRunId: @remoteId
      origin: test['origin']
      duration: test['duration']
      result: test['status']
      startedAt: test['startedAt']
      resultData:
        request: test['request']
        realResponse: test['actual']
        expectedResponse: test['expected']
        result: test['results']

    return data

  _performRequestAsync: (path, method, body, callback) =>
    buffer = ""

    handleResponse = (res) =>
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
          return callback new Error("Apiary reporter: Failed to JSON parse Apiary API response body: \n #{buffer}")


        if @verbose
          info =
            headers: res.headers
            statusCode: res.statusCode
            body: parsedBody
          logger.log 'Rest Reporter Response:', JSON.stringify(info, null, 2)

        return callback(undefined, res, parsedBody)

    parsedUrl = url.parse @configuration['apiUrl']
    system = os.type() + ' ' + os.release() + '; ' + os.arch()

    postData = JSON.stringify body

    options =
      host: parsedUrl['hostname']
      port: parsedUrl['port']
      path: path
      method: method
      headers:
        'User-Agent': "Dredd REST Reporter/" + packageConfig['version'] + " (" + system + ")"
        'Content-Type': 'application/json'
        'Content-Length': Buffer.byteLength(postData, 'utf8')

    unless @configuration['apiToken'] == null
      options.headers['Authentication'] = 'Token ' + @configuration['apiToken']

    if @verbose
      info =
        options: options
        body: body
      logger.log 'Rest Reporter Request:', JSON.stringify(info, null, 2)

    handleReqError = (error) =>
      @serverError = true
      if CONNECTION_ERRORS.indexOf(error.code) > -1
        return callback "Apiary reporter: Error connecting to Apiary test reporting API."
      else
        return callback error, req, null

    if @configuration.apiUrl?.indexOf('https') is 0
      if @verbose
        logger.log 'Starting REST Reporter HTTPS Request'
      req = https.request options, handleResponse

      req.on 'error', handleReqError

    else
      if @verbose
        logger.log 'Starting REST Reporter HTTP Response'
      req = http.request options, handleResponse

      req.on 'error', handleReqError

    req.write postData
    req.end()

module.exports = ApiaryReporter
