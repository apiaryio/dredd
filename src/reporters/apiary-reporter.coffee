request = require 'request'
os = require 'os'
url = require 'url'

clone = require 'clone'
generateUuid = require('uuid').v4

packageData = require './../../package.json'
logger = require('./../logger')

CONNECTION_ERRORS = ['ECONNRESET', 'ENOTFOUND', 'ESOCKETTIMEDOUT', 'ETIMEDOUT', 'ECONNREFUSED', 'EHOSTUNREACH', 'EPIPE']


class ApiaryReporter
  constructor: (emitter, stats, tests, config, runner) ->
    @type = 'apiary'
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
    @serverError = false
    @configuration =
      apiUrl: @_get 'apiaryApiUrl', 'APIARY_API_URL', 'https://api.apiary.io'
      apiToken: @_get 'apiaryApiKey', 'APIARY_API_KEY', null
      apiSuite: @_get 'apiaryApiName', 'APIARY_API_NAME', null
    logger.verbose("Using '#{@type}' reporter.")

    if not @configuration.apiToken and not @configuration.apiSuite
      logger.warn('''\
        Apiary API Key or API Project Subdomain were not provided. \
        Configure Dredd to be able to save test reports alongside your Apiary API project: \
        https://dredd.readthedocs.io/en/latest/how-to-guides/#using-apiary-reporter-and-apiary-tests\
      ''')
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
      @uuid = generateUuid()
      @startedAt = Math.round(new Date().getTime() / 1000)

      # Cycle through all keys from
      # - config.custom.apiaryReporterEnv
      # - process.env keys
      ciVars = /^(TRAVIS|CIRCLE|CI|DRONE|BUILD_ID)/
      envVarNames = @_getKeys()
      ciEnvVars = {}
      for envVarName in envVarNames when envVarName.match(ciVars)?
        ciEnvVars[envVarName] = @_get envVarName, envVarName

      # transform blueprints data to array
      blueprints = (data for own filename, data of blueprintsData)

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

    emitter.on 'test error', (error, test, callback) =>
      return callback() if @serverError == true
      data = @_transformTestToReporter test

      data.resultData.result ?= {}
      data.resultData.result.general ?= []

      if CONNECTION_ERRORS.indexOf(error.code) > -1
        data.resultData.result.general.push {
          severity: 'error', message: "Error connecting to server under test!"
        }
      else
        data.resultData.result.general.push {
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

  _performRequestAsync: (path, method, reqBody, callback) ->
    handleRequest = (err, res, resBody) =>
      if err
        @serverError = true
        logger.debug('Requesting Apiary API errored:', "#{err}" or err.code)

        if CONNECTION_ERRORS.indexOf(err.code) > -1
          return callback(new Error('Apiary reporter could not connect to Apiary API'))
        else
          return callback(err)

      logger.verbose('Handling HTTP response from Apiary API')
      try
        parsedBody = JSON.parse(resBody)
      catch err
        err = new Error("""\
          Apiary reporter failed to parse Apiary API response body: \
          #{err.message}\n#{resBody}\
        """)
        return callback(err)

      info = {headers: res.headers, statusCode: res.statusCode, body: parsedBody}
      logger.debug('Apiary reporter response:', JSON.stringify(info, null, 2))
      return callback(null, res, parsedBody)

    body = JSON.stringify(reqBody)
    system = os.type() + ' ' + os.release() + '; ' + os.arch()
    headers =
      'User-Agent': "Dredd Apiary Reporter/#{packageData.version} (#{system})"
      'Content-Type': 'application/json'
      'Content-Length': Buffer.byteLength(body, 'utf8')

    options = {
      uri: @configuration.apiUrl + path
      method
      headers
      body
    }
    if @configuration.apiToken
      options.headers['Authentication'] = 'Token ' + @configuration.apiToken
    if @config?.options?.proxy
      options.proxy = @config.options.proxy

    try
      protocol = options.uri.split(':')[0].toUpperCase()
      logger.verbose("""\
        About to perform an #{protocol} request from Apiary reporter \
        to Apiary API: #{options.method} #{options.uri} \
        (#{if body then 'with' else 'without'} body)\
      """)
      logger.debug('Request details:', JSON.stringify({options, body}, null, 2))
      request(options, handleRequest)
    catch error
      logger.debug('Requesting Apiary API errored:', error)
      return callback(error)


module.exports = ApiaryReporter
