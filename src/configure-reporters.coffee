Reporter = require './reporters/reporter'
XUnitReporter = require './reporters/x-unit-reporter'
CliReporter = require './reporters/cli-reporter'

configureReporters = (config) ->
  config.reporter = new Reporter()
  config.reporter.addReporter new CliReporter unless config.options.silent

  if config.options.reporter is 'junit'
    config.reporter.addReporter new XUnitReporter(config.options.output)

module.exports = configureReporters
