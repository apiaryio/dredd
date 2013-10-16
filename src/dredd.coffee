async = require 'async'
fs = require 'fs'
protagonist = require 'protagonist'
cli = require 'cli'
executeTransaction = require './execute-transaction'
blueprintAstToRuntime = require './blueprint-ast-to-runtime'
xUnitReporter = require './x-unit-reporter'
cliReporter = require './cli-reporter'

options =
  'dry-run': ['d', 'Run without performing tests.'],
  silent: ['s', 'Suppress all command line output'],
  reporter: ['r', 'Output additional report format. Options: junit', 'string'],
  output: ['o', 'Specifies output file when using additional reporter', 'file']

class dredd
  constructor: (config) ->
    @configuration =
      blueprintPath: null,
      server: null,
      reporters: [new cliReporter()],
      options:
        'dry-run': false,
        silent: false,
        reporter: null,
        output: null

    for own key, value of config
      @configuration["#{key}"] = value

  run: (callback) ->
    config = @configuration
    fs.readFile config.blueprintPath, 'utf8', (error, data) ->
      throw error if error
      protagonist.parse data, (error, result) ->
        throw error if error
        runtime = blueprintAstToRuntime result['ast']

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
          cli.fatal

        transactionsWithConfiguration = []

        cli.info JSON.stringify config

        config.reporters = if config.options.silent then [] else [new cliReporter]

        if config.options.reporter is 'junit'
          config.reporters.push new xUnitReporter(@configuration.options.output)

        cli.debug "Configuration: " + JSON.stringify config

        for transaction in runtime['transactions']
          transaction['configuration'] = @configuration
          transactionsWithConfiguration.push transaction

        async.eachSeries transactionsWithConfiguration, executeTransaction, (error) ->
          throw error if error

          for reporter in config.reporters
            reporter.createReport() if reporter.createReport?
          callback()


module.exports = dredd
module.exports.options = options
