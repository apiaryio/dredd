async = require 'async'
fs = require 'fs'
protagonist = require 'protagonist'
cli = require 'cli'
executeTransaction = require './execute-transaction'
blueprintAstToRuntime = require './blueprint-ast-to-runtime'
xUnitReporter = require './x-unit-reporter'

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
      reporters: config.reporters || [],
      options:
        'dry-run': false,
        silent: false,
        reporter: null,
        output: null

    for own key, value of config
      @configuration["#{key}"] = value

  run: (callback) ->
    cli.debug "Configuration: " + JSON.stringify @configuration
    fs.readFile @configuration.blueprintPath, 'utf8', (error, data) ->
      if error
        cli.fatal error
        callback()
      else
        protagonist.parse data, (error, result) ->
          if error
            cli.fatal error
            callback()
          else
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

            cli.debug "Configuration: " + JSON.stringify @configuration

            if @configuration.options.reporter is 'junit'
              @configuration.reporters = [] unless @configuration.reporters?
              cli.debug "Configuration: " + JSON.stringify @configuration
              @configuration.reporters.push new xUnitReporter(@configuration.options.output)

            cli.debug "Reporters: " + JSON.stringify(@configuration.reporters)

            for transaction in runtime['transactions']
              transaction['configuration'] = @configuration
              transactionsWithConfiguration.push transaction

            async.eachSeries transactionsWithConfiguration, executeTransaction, (error) ->
              if error
                cli.error error
                callback()
              else
                for reporter in @configuration.reporters
                  reporter.createReport()
                callback()


module.exports = dredd
module.exports.options = options
