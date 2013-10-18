Reporter = require './reporter'
XUnitReporter = require './x-unit-reporter'
CliReporter = require './cli-reporter'

configureReporters = (config) ->
  config.reporter = new Reporter()
  config.reporter.addReporter new CliReporter unless config.options.silent

  if config.options.reporter is 'junit'
    config.reporter.addReporter new XUnitReporter(config.options.output)

module.exports = configureReporters
