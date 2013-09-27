async = require 'async'
cliUtils = require './cli-utils'
executeTransaction = require './execute-transaction'
fs = require 'fs'
protagonist = require 'protagonist'
blueprintAstToRuntime = require './blueprint-ast-to-runtime'
xUnitReporter = require './x-unit-reporter'

cli = (configuration, callback) ->
  configuration.args = [] if not configuration.args?
  fs.readFile configuration['blueprintPath'], 'utf8', (error, data) ->
    if error
      cliUtils.error error
      cliUtils.exit 1
      callback()
    else
      protagonist.parse data, (error, result) ->
        if error
          cliUtils.error error
          cliUtils.exit 1
          callback()
        else
          runtime = blueprintAstToRuntime result['ast']

          if runtime['warnings'].length > 0
            for warning in runtime['warnings']
              message = warning['message']
              origin = warning['origin']

              cliUtils.log "Runtime compilation warning: \"" + warning['message'] + "\" on " + \
                origin['resourceGroupName'] + \
                ' > ' + origin['resourceName'] + \
                ' > ' + origin['actionName']

          if runtime['errors'].length > 0
            for error in runtime['errors']
              message = error['message']
              origin = error['origin']

              cliUtils.log "Runtime compilation error: \"" + error['message'] + "\" on " + \
                origin['resourceGroupName'] + \
                ' > ' + origin['resourceName'] + \
                ' > ' + origin['actionName']
            cliUtils.exit 1

          tranasctionsWithConfigutration = []

          reporter = null
          if '--junitreport' in configuration.args
            reporter = new xUnitReporter(null)
            configuration['reporter'] = reporter

          for transaction in runtime['transactions']
            transaction['configuration'] = configuration
            tranasctionsWithConfigutration.push transaction

          async.eachSeries tranasctionsWithConfigutration, executeTransaction, (errror) ->
            if error
              cliUtils.error error
              cliUtils.exit 1
              callback()
            else
              reporter.createReport() if reporter?
              cliUtils.exit 0
              callback()



module.exports = cli
