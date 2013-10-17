async = require 'async'
fs = require 'fs'
protagonist = require 'protagonist'
cli = require 'cli'
executeTransaction = require './execute-transaction'
blueprintAstToRuntime = require './blueprint-ast-to-runtime'
XUnitReporter = require './x-unit-reporter'
CliReporter = require './cli-reporter'

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
      reporters: [],
      options:
        'dry-run': false,
        silent: false,
        reporter: null,
        output: null

    for own key, value of config
      @configuration[key] = value

    ## buildReporters
    @configuration.reporters = if @configuration.options.silent then [] else [new CliReporter]

    if @configuration.options.reporter is 'junit'
      @configuration.reporters.push new XUnitReporter(@configuration.options.output)
    ##

  run: (callback) ->
    config = @configuration

    fs.readFile config.blueprintPath, 'utf8', (error, data) ->
      if error
        return callback(error)

      protagonist.parse data, (error, result) ->
        if error
          return callback(error)

        runtime = blueprintAstToRuntime result['ast']

        ## handleRuntimeProblems
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
          return callback(new Error("Error parsing ast to blueprint."))
        ##

        ## transactionsWithConfiguration()
        transactionsWithConfiguration = []

        for transaction in runtime['transactions']
          transaction['configuration'] = config
          transactionsWithConfiguration.push transaction
        ##

        async.eachSeries transactionsWithConfiguration, executeTransaction, (error) ->
          if error
            return callback(error)

          ## createReports
          for reporter in config.reporters
            reporter.createReport() if reporter.createReport?
          ##

          return callback() if typeof callback is 'function'


module.exports = Dredd
module.exports.options = options
