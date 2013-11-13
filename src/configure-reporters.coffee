Reporter = require './reporter'
XUnitReporter = require './x-unit-reporter'
CliReporter = require './cli-reporter'
RestReporter = require './rest-reporter'

configureReporters = (config) ->
  config.reporter = new Reporter()
  config.reporter.addReporter new CliReporter unless config.options.silent

  if config.options.reporter is 'junit'
    config.reporter.addReporter new XUnitReporter(config.options.output)

  if process.env['DREDD_REST_TOKEN']? && process.env['DREDD_REST_SUITE']?

    config.options.restReporter = 
      apiUrl: process.env['DREDD_REST_URL'] || 'https://api.apiary.io'
      apiToken: process.env['DREDD_REST_TOKEN']
      suite: process.env['DREDD_REST_SUITE']

    config.reporter.addReporter new RestReporter config

module.exports = configureReporters
