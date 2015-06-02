BaseReporter = require './reporters/base-reporter'
XUnitReporter = require './reporters/x-unit-reporter'
CliReporter = require './reporters/cli-reporter'
DotReporter = require './reporters/dot-reporter'
NyanCatReporter = require './reporters/nyan-reporter'
HtmlReporter = require './reporters/html-reporter'
MarkdownReporter = require './reporters/markdown-reporter'
ApiaryReporter = require './reporters/apiary-reporter'

logger = require './logger'

fileReporters = ['junit', 'html', 'markdown', 'apiary']
cliReporters = ['dot', 'nyan']

intersection = (a, b) ->
  [a, b] = [b, a] if a.length > b.length
  value for value in a when value in b

configureReporters = (config, stats, tests, runner) ->
  baseReporter = new BaseReporter(config.emitter, stats, tests)
  reporters = config.options.reporter
  outputs = config.options.output

  addCli = (reporters) ->
    if reporters.length > 0
      usedCliReporters = intersection reporters, cliReporters
      if usedCliReporters.length is 0
        cliReporter = new CliReporter(config.emitter, stats, tests, config.options['inline-errors'], config.options.details)
      else
        addReporter(usedCliReporters[0], config.emitter, stats, tests)
    else
      cliReporter = new CliReporter(config.emitter, stats, tests, config.options['inline-errors'], config.options.details)

  addReporter = (reporter, emitter, stats, tests, path) ->
    switch reporter
      when 'junit'
        xUnitReporter = new XUnitReporter(emitter, stats, tests, path, config.options.details)
      when 'dot'
        dotReporter = new DotReporter(emitter, stats, tests)
      when 'nyan'
        nyanCatReporter = new NyanCatReporter(emitter, stats, tests)
      when 'html'
        htmlReporter = new HtmlReporter(emitter, stats, tests, path, config.options.details)
      when 'markdown'
        mdReporter = new MarkdownReporter(emitter, stats, tests, path, config.options.details)
      when 'apiary'
        apiaryReporter = new ApiaryReporter(emitter, stats, tests, config, runner)
      # else
      #   Cannot happen, due to 'intersection' usage
      #   logger.warn "Invalid reporter #{reporter} selected, ignoring."


  addCli(reporters) if not config.options.silent

  usedFileReporters = intersection reporters, fileReporters

  stats.fileBasedReporters = usedFileReporters.length

  if usedFileReporters.length > 0
    usedFileReportersLength = usedFileReporters.length
    if reporters.indexOf('apiary') > -1
      usedFileReportersLength = usedFileReportersLength - 1

    if usedFileReportersLength > outputs.length
      logger.warn """
      There are more reporters requiring output paths than there are output paths \
      provided, using default paths for additional file-based reporters.
      """

    for reporter, i in usedFileReporters
      path = if outputs[i] then outputs[i] else null
      addReporter(reporter, config.emitter, stats, tests, path)



module.exports = configureReporters
