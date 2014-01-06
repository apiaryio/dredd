{EventEmitter} = require 'events'
async = require 'async'
fs = require 'fs'
protagonist = require 'protagonist'
cli = require 'cli'
executeTransaction = require './execute-transaction'
blueprintAstToRuntime = require './blueprint-ast-to-runtime'
configureReporters = require './configure-reporters'

options =
  'dry-run': {'alias': 'd', 'description': 'Run without performing tests.'}
  'silent': {'alias': 's', 'description': 'Suppress all command line output'}
  'reporter': {'alias': 'r', 'description': 'Output additional report format. Options: junit, nyan, dot, markdown, html'}
  'output': {'alias': 'o', 'description': 'Specifies output file when using additional reporter'}
  'debug': { 'description': 'Display debug information'}

###
  Events:
  start
  end
  test start
  test fail
  test pass
  test skip
  test error
###

class Dredd
  constructor: (config) ->
    emitter = new EventEmitter
    @configuration =
      blueprintPath: null,
      server: null,
      reporter: null,
      request: null,
      emitter: emitter,
      options:
        'dry-run': false,
        silent: false,
        reporter: null,
        output: null,
        debug: false,
    @testData =
      tests: [],
      stats:
        tests: 0
        failures: 0
        errors: 0
        passes: 0
        skipped: 0
        start: 0
        end: 0
        duration: 0

    for own key, value of config
      @configuration[key] = value

    configureReporters(@configuration, @testData)

  run: (callback) ->
    config = @configuration

    config.emitter.emit 'start'

    fs.readFile config.blueprintPath, 'utf8', (parseError, data) ->
      return callback(parseError, config.reporter) if parseError

      protagonist.parse data, (protagonistError, result) ->
        return callback(protagonistError, config.reporter) if protagonistError

        runtime = blueprintAstToRuntime result['ast']

        runtimeError = handleRuntimeProblems runtime
        return callback(runtimeError, config.reporter) if runtimeError

        async.eachSeries configuredTransactions(runtime, config), executeTransaction, (error) ->
          if error
            config.emitter 'test error', error
            return callback error, config.reporter

          config.emitter.emit 'end'

  handleRuntimeProblems = (runtime) ->
    if runtime['warnings'].length > 0
      for warning in runtime['warnings']
        message = warning['message']
        origin = warning['origin']

        cli.info "Runtime compilation warning: " + warning['message'] + "\n on " + \
          origin['resourceGroupName'] + \
          ' > ' + origin['resourceName'] + \
          ' > ' + origin['actionName']

    if runtime['errors'].length > 0
      for error in runtime['errors']
        message = error['message']
        origin = error['origin']

        cli.error "Runtime compilation error: " + error['message'] + "\n on " + \
          origin['resourceGroupName'] + \
          ' > ' + origin['resourceName'] + \
          ' > ' + origin['actionName']

      return new Error "Error parsing ast to blueprint."

  configuredTransactions = (runtime, config) ->
    transactionsWithConfiguration = []

    for transaction in runtime['transactions']
      transaction['configuration'] = config
      transactionsWithConfiguration.push transaction

    return transactionsWithConfiguration



module.exports = Dredd
module.exports.options = options
