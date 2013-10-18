async = require 'async'
fs = require 'fs'
protagonist = require 'protagonist'
cli = require 'cli'
executeTransaction = require './execute-transaction'
blueprintAstToRuntime = require './blueprint-ast-to-runtime'
configureReporters = require './configure-reporters'

options =
  'dry-run': ['d', 'Run without performing tests.'],
  silent: ['s', 'Suppress all command line output'],
  reporter: ['r', 'Output additional report format. Options: junit', 'string'],
  output: ['o', 'Specifies output file when using additional reporter', 'file']

class Dredd
  constructor: (config) ->
    @configuration =
      blueprintPath: null,
      server: null,
      reporter: null,
      options:
        'dry-run': false,
        silent: false,
        reporter: null,
        output: null

    for own key, value of config
      @configuration[key] = value

    configureReporters(@configuration)

  run: (callback) ->
    config = @configuration

    fs.readFile config.blueprintPath, 'utf8', (error, data) ->
      return callback error if error

      protagonist.parse data, (error, result) ->
        return callback error if error

        runtime = blueprintAstToRuntime result['ast']

        runtimeError = handleRuntimeProblems runtime
        return callback runtimeError if runtimeError

        async.eachSeries configuredTransactions(runtime, config), executeTransaction, (error) ->
          return callback error if error

          config.reporter.createReport (error) ->
            return callback error if error

          return callback()

  handleRuntimeProblems = (runtime) ->
    if runtime['warnings'].length > 0
      for warning in runtime['warnings']
        message = warning['message']
        origin = warning['origin']

        cli.info "Runtime compilation warning: \"" + warning['message'] + "\" on " + \
          origin['resourceGroupName'] + \
          ' > ' + origin['resourceName'] + \
          ' > ' + origin['actionName']

    if runtime['errors'].length > 0
      for error in runtime['errors']
        message = error['message']
        origin = error['origin']

        cli.error "Runtime compilation error: \"" + error['message'] + "\" on " + \
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
