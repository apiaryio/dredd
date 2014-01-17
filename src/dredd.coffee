async = require 'async'
fs = require 'fs'
protagonist = require 'protagonist'
cli = require 'cli'
executeTransaction = require './execute-transaction'
blueprintAstToRuntime = require './blueprint-ast-to-runtime'
configureReporters = require './configure-reporters'

options =
  'dry-run': ['d', 'Run without performing tests.']
  silent: ['s', 'Suppress all command line output']
  reporter: ['r', 'Output additional report format. Options: junit', 'string']
  output: ['o', 'Specifies output file when using additional reporter', 'file']
  debug: [null, 'Display debug information']
  sorted: [null, 'Sort transactions by action']

class Dredd
  constructor: (config) ->
    @configuration =
      blueprintPath: null,
      server: null,
      reporter: null,
      request: null,
      options:
        'dry-run': false,
        silent: false,
        reporter: null,
        output: null,
        debug: false

    for own key, value of config
      @configuration[key] = value

    configureReporters(@configuration)

  run: (callback) ->
    config = @configuration

    fs.readFile config.blueprintPath, 'utf8', (parseError, data) ->
      return callback(parseError, config.reporter) if parseError

      protagonist.parse data, (protagonistError, result) ->
        return callback(protagonistError, config.reporter) if protagonistError

        runtime = blueprintAstToRuntime result['ast']

        runtimeError = handleRuntimeProblems runtime
        return callback(runtimeError, config.reporter) if runtimeError

        async.eachSeries configuredTransactions(runtime, config), executeTransaction, (error) ->
          if error
            return callback error, config.reporter

          config.reporter.createReport (reporterError) ->
            return callback reporterError, config.reporter

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

    return if configuration.options['sorted']
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
    arr.map (a, i) ->
      a['_index'] = i

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
        when methodIndexA == methodIndexB
          a['_index'] - b['_index']

    arr.map (a) ->
      delete a['_index']

    arr

module.exports = Dredd
module.exports.options = options
