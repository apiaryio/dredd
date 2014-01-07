fs = require 'fs'
logger = require './../logger'

class HtmlReporter
  constructor: (emitter, stats, tests, path) ->
    @type = "html"
    @stats = stats
    @tests = tests
    @path = @sanitizedPath(path)
    @configureEmitter emitter

  sanitizedPath: (path) =>
    filePath = if path? then process.cwd() +  "/" + path else process.cwd() + "/report.html"
    if fs.existsSync(filePath)
      logger.info "File exists at #{filePath}, deleting..."
      fs.unlinkSync(filePath)
    filePath

  configureEmitter: (emitter) =>
    emitter.on 'start', =>


    emitter.on 'end', =>


    emitter.on 'test pass', (test) =>


    emitter.on 'test skip', (test) =>


    emitter.on 'test fail', (test) =>


    emitter.on 'test error', (test, error) =>

module.exports = HtmlReporter
