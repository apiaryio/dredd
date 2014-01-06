BaseReporter = require './reporters/base-reporter'
XUnitReporter = require './reporters/x-unit-reporter'
CliReporter = require './reporters/cli-reporter'
DotReporter = require './reporters/dot-reporter'
NyanCatReporter = require './reporters/nyan-reporter'
HtmlReporter = require './reporters/html-reporter'
MarkdownReporter = require './reporters/markdown-reporter'

configureReporters = (config, data) ->
  baseReporter = new BaseReporter(config.emitter, data.stats, data.tests)

  addCli = () ->
    cliReporter = new CliReporter(config.emitter, data.stats, data.tests) unless config.options.silent?

  switch config.options.reporter
    when 'junit'
      xUnitReporter = new XUnitReporter(config.emitter, data.stats, data.tests, config.options.output)
      addCli()
    when 'dot'
      dotReporter = new DotReporter(config.emitter, data.stats, data.tests)
    when 'nyan'
      nyanCatReporter = new NyanCatReporter(config.emitter, data.stats, data.tests)
    when 'html'
      htmlReporter = new HtmlReporter(config.emitter, data.stats, data.tests, config.options.output)
      addCli()
    when 'markdown'
      mdReporter = new MarkdownReporter(config.emitter, data.stats, data.tests, config.options.output)
      addCli()
    else
      addCli()

module.exports = configureReporters
