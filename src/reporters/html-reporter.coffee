{EventEmitter} = require 'events'
fs = require 'fs'
logger = require './../logger'

class HtmlReporter extends EventEmitter
  constructor: (emitter, stats, tests, path, details) ->
    super()
    @type = "html"
    @stats = stats
    @tests = tests
    @path = @sanitizedPath(path)
    @details = details
    @configureEmitter emitter

  sanitizedPath: (path) =>
    filePath = if path? then process.cwd() +  "/" + path else process.cwd() + "/report.html"
    if fs.existsSync(filePath)
      logger.info "File exists at #{filePath}, deleting..."
      fs.unlinkSync(filePath)
    filePath

  configureEmitter: (emitter) =>
    emitter.on 'start', =>


    emitter.on 'end', (callback) =>
      callback()

    emitter.on 'test pass', (test) =>


    emitter.on 'test skip', (test) =>


    emitter.on 'test fail', (test) =>


    emitter.on 'test error', (test, error) =>

module.exports = HtmlReporter
