BaseReporter = require './reporters/base-reporter'
XUnitReporter = require './reporters/x-unit-reporter'
CliReporter = require './reporters/cli-reporter'
DotReporter = require './reporters/dot-reporter'
NyanCatReporter = require './reporters/nyan-reporter'
HtmlReporter = require './reporters/html-reporter'
MarkdownReporter = require './reporters/markdown-reporter'

logger = require './logger'

fileReporters = ['junit', 'html', 'markdown']

intersection = (a, b) ->
  [a, b] = [b, a] if a.length > b.length
  value for value in a when value in b

configureReporters = (config, data) ->
  baseReporter = new BaseReporter(config.emitter, data.stats, data.tests)

  addCli = (reporters) ->
    if reporters instanceof String and reporters in fileReporters
       cliReporter = new CliReporter(config.emitter, data.stats, data.tests)
    else if reporters instanceof Array
      for reporter in reporters
        if reporter in fileReporters
          cliReporter = new CliReporter(config.emitter, data.stats, data.tests)
          break
    else
        cliReporter = new CliReporter(config.emitter, data.stats, data.tests)

  addReporter = (reporter, emitter, stats, tests, path) ->
    switch reporter
      when 'junit'
        xUnitReporter = new XUnitReporter(emitter, stats, data.tests, path)
      when 'dot'
        dotReporter = new DotReporter(config.emitter, data.stats, data.tests)
      when 'nyan'
        nyanCatReporter = new NyanCatReporter(config.emitter, data.stats, data.tests)
      when 'html'
        htmlReporter = new HtmlReporter(config.emitter, data.stats, data.tests, path)
      when 'markdown'
        mdReporter = new MarkdownReporter(config.emitter, data.stats, data.tests, path)


  if config.options.reporter instanceof String
    addReporter(reporter, config.emitter, data.stats, data.tests, config.options.output)
  else if config.options.reporter instanceof Array
    reporters = intersection config.options.reporter, fileReporters

    usePaths = true
    if not config.options.output? or reporters.length is not config.options.output.length
      logger.warning "There are more reporters requiring output paths than there are output paths provided, using default paths for file-based reporters."
      usePaths = false

    for reporter, i in config.options.reporter
      path = if usePaths then config.options.output[i]  else null
      logger.info path
      addReporter(reporter, config.emitter, data.stats, data.tests, path)

  if !config.options.silent?
    addCli()


module.exports = configureReporters
