BaseReporter = require './reporters/base-reporter'
XUnitReporter = require './reporters/x-unit-reporter'
CliReporter = require './reporters/cli-reporter'
DotReporter = require './reporters/dot-reporter'
NyanCatReporter = require './reporters/nyan-reporter'

configureReporters = (config, data) ->
  baseReporter = new BaseReporter(config.emitter, data.stats, data.tests)

  switch config.options.reporter
    when 'junit'
      xUnitReporter = new XUnitReporter(config.emitter, data.stats, data.tests, config.options.output)
      cliReporter = new CliReporter(config.emitter, data.stats, data.tests) unless config.options.silent?
    when 'dot'
      dotReporter = new DotReporter(config.emitter, data.stats, data.tests)
    when 'nyan'
      nyanCatReporter = new NyanCatReporter(config.emitter, data.stats, data.tests)

module.exports = configureReporters
