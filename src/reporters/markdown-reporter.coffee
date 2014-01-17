{EventEmitter} = require 'events'
fs = require 'fs'

logger = require './../logger'
prettifyResponse = require './../prettify-response'

class MarkdownReporter extends EventEmitter
  constructor: (emitter, stats, tests, path, details) ->
    super()
    @type = "markdown"
    @stats = stats
    @tests = tests
    @path = @sanitizedPath(path)
    @buf = ""
    @level = 1
    @details = details
    @configureEmitter emitter

  sanitizedPath: (path) =>
    filePath = if path? then process.cwd() + "/" + path else process.cwd() + "/report.md"
    if fs.existsSync(filePath)
      logger.info "File exists at #{filePath}, deleting..."
      fs.unlinkSync(filePath)
    filePath

  configureEmitter: (emitter) =>

    title = (str) =>
      Array(@level).join("#") + " " + str
    # indent = ->
    #   Array(@level).join "  "

    emitter.on 'start', =>
      @level++
      @buf += title('Dredd Tests') + "\n"

    emitter.on 'end', (callback) =>
      fs.writeFile @path, @buf, (err) =>
        if err
          logger.error err
        callback()

    emitter.on 'test start', (test) =>
      @level++

    emitter.on 'test pass', (test) =>
      @buf += title("Pass: " + test.title) +  "\n"

      if @details
        @level++
        @buf += title("Request") + "\n```\n" + prettifyResponse(test.request) + "\n```\n\n"
        @buf += title("Expected") + "\n```\n" + prettifyResponse(test.expected) + "\n```\n\n"
        @buf += title("Actual") + "\n```\n" + prettifyResponse(test.actual) + "\n```\n\n"
        @level--

      @level--

    emitter.on 'test skip', (test) =>
      @buf += title("Skip: " + test.title) +  "\n"
      @level--

    emitter.on 'test fail', (test) =>
      @buf += title "Fail: " + test.title +  "\n"

      @level++
      @buf += title("Message") + "\n```\n" + test.message + "\n```\n\n"
      @buf += title("Request") + "\n```\n" + prettifyResponse(test.request) + "\n```\n\n"
      @buf += title("Expected") + "\n```\n" + prettifyResponse(test.expected) + "\n```\n\n"
      @buf += title("Actual") + "\n```\n" + prettifyResponse(test.actual) + "\n```\n\n"
      @level--

      @level--

    emitter.on 'test error', (error, test) =>
      @buf += title "Error: " + test.title +  "\n"
      @buf += "\n```\n"
      @buf += "\nError: \n"  + error + "\nStacktrace: \n" + error.stack + "\n"
      @buf += "```\n\n"
      @level--


module.exports = MarkdownReporter
