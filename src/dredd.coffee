{EventEmitter} = require 'events'
fs = require 'fs'

async = require 'async'
protagonist = require 'protagonist'

logger = require './logger'
options = require './options'

executeTransaction = require './execute-transaction'
blueprintAstToRuntime = require './blueprint-ast-to-runtime'
configureReporters = require './configure-reporters'

class Dredd
  constructor: (config) ->
    @tests = []
    @stats =
        tests: 0
        failures: 0
        errors: 0
        passes: 0
        skipped: 0
        start: 0
        end: 0
        duration: 0
    @configuration = applyConfiguration(config, @stats)
    configureReporters @configuration, @stats, @tests

  run: (callback) ->
    config = @configuration
    stats = @stats

    config.emitter.emit 'start'

    fs.readFile config.blueprintPath, 'utf8', (parseError, data) ->
      return callback(parseError, stats) if parseError
      protagonist.parse data, blueprintParsingComplete

    blueprintParsingComplete = (protagonistError, result) =>
      return callback(protagonistError, config.reporter) if protagonistError

      runtime = blueprintAstToRuntime result['ast']

      runtimeError = handleRuntimeProblems runtime

      return callback(runtimeError, stats) if runtimeError

      async.eachSeries configuredTransactions(runtime, config), executeTransaction, () =>
        @transactionsComplete(config.emitter, stats, callback)

  transactionsComplete: (emitter, stats, callback) ->
    reporterCount = emitter.listeners('end').length
    emitter.emit 'end' , () ->
      reporterCount--
      if reporterCount is 0
        callback(null, stats)

  applyConfiguration = (config) ->

    coerceToArray = (value) ->
      if typeof value is 'string'
        value = [value]
      else if !value?
        value = []
      else if value instanceof Array
        value
      else value

    configuration =
      blueprintPath: null
      server: null
      emitter: new EventEmitter
      options:
        'dry-run': false
        silent: false
        reporter: null
        output: null
        debug: false
        header: null
        user: null
        'inline-errors':false
        details: false
        method: []
        color: true
        level: 'info'
        timestamp: false
        sorted: false

    #normalize options and config
    for own key, value of config
      configuration[key] = value

    #coerce single/multiple options into an array
    configuration.options.reporter = coerceToArray(configuration.options.reporter)
    configuration.options.output = coerceToArray(configuration.options.output)
    configuration.options.header = coerceToArray(configuration.options.header)
    configuration.options.method = coerceToArray(configuration.options.method)

    for method in configuration.options.method
      method.toUpperCase()

    if configuration.options.user?
      authHeader = 'Authorization:Basic ' + new Buffer(configuration.options.user).toString('base64')
      configuration.options.header.push authHeader

    logger.transports.console.colorize = configuration.options.color
    logger.transports.console.silent = configuration.options.silent
    logger.transports.console.level = configuration.options.level
    logger.transports.console.timestamp = configuration.options.timestamp
    logger.sys.transports.systemConsole.colorize = configuration.options.color
    logger.sys.transports.systemConsole.silent = configuration.options.silent
    logger.sys.transports.systemConsole.level = configuration.options.level
    logger.sys.transports.systemConsole.timestamp = configuration.options.timestamp

    return configuration

  handleRuntimeProblems = (runtime) ->
    if runtime['warnings'].length > 0
      for warning in runtime['warnings']
        message = warning['message']
        origin = warning['origin']

        logger.warn "Runtime compilation warning: " + warning['message'] + "\n on " + \
          origin['resourceGroupName'] + \
          ' > ' + origin['resourceName'] + \
          ' > ' + origin['actionName']

    if runtime['errors'].length > 0
      for error in runtime['errors']
        message = error['message']
        origin = error['origin']

        logger.error "Runtime compilation error: " + error['message'] + "\n on " + \
          origin['resourceGroupName'] + \
          ' > ' + origin['resourceName'] + \
          ' > ' + origin['actionName']

      return new Error "Error parsing ast to blueprint."

  configuredTransactions = (runtime, config) ->
    transactionsWithConfiguration = []

    for transaction in runtime['transactions']
      transaction['configuration'] = config
      transactionsWithConfiguration.push transaction

    return if config.options['sorted']
      sortTransactions(transactionsWithConfiguration)
    else
      transactionsWithConfiguration

  # Often, API documentation is arranged with a sequence of methods that lends
  # itself to understanding by the human reading the documentation.
  #
  # However, the sequence of methods may not be appropriate for the machine
  # reading the documentation in order to test the API.
  #
  # By sorting the transactions by their methods, it is possible to ensure that
  # objects are created before they are read, updated, or deleted.
  sortTransactions = (arr) ->
    arr.sort (a, b) ->
      sortedMethods = [
        "CONNECT", "OPTIONS",
        "POST", "GET", "HEAD", "PUT", "PATCH", "DELETE",
        "TRACE"
      ]
      methodIndexA = sortedMethods.indexOf(a['request']['method'])
      methodIndexB = sortedMethods.indexOf(b['request']['method'])
      return switch
        when methodIndexA < methodIndexB then -1
        when methodIndexA > methodIndexB then 1
        else 0
    arr

module.exports = Dredd
module.exports.options = options
