{EventEmitter} = require 'events'
fs = require 'fs'
logger = require './../logger'

class MarkdownReporter extends EventEmitter
  constructor: (emitter, stats, tests, path) ->
    super()
    @type = "dot"
    @stats = stats
    @tests = tests
    @path = @sanitizedPath(path)
    @configureEmitter emitter

  sanitizedPath: (path) =>
    filePath = if path? then process.cwd() + "/" + path else process.cwd() + "/report.md"
    if fs.existsSync(filePath)
      logger.info "File exists at #{filePath}, deleting..."
      fs.unlinkSync(filePath)
    filePath

  configureEmitter: (emitter) =>

    buf = ""
    level = 1

    title = (str) ->
      Array(level).join("#") + " " + str
    indent = ->
      Array(level).join "  "

    emitter.on 'start', =>
      level++
      buf += title('Dredd Tests') + "\n"

    emitter.on 'end', =>
      fs.writeFile @path, buf, (err) =>
        if err
          logger.error err
        @emit 'save'

    emitter.on 'test start', (test) =>
      level++

    emitter.on 'test pass', (test) =>
      buf += title("Pass: " + test.title) +  "\n"
      level--

    emitter.on 'test skip', (test) =>
      buf += title("Skip: " + test.title) +  "\n"
      level--

    emitter.on 'test fail', (test) =>
      buf += title "Fail: " + test.title +  "\n"
      buf += "\n```\n"
      buf += test.message + "\n"
      buf += "```\n\n"
      level--


    emitter.on 'test error', (test, error) =>
      buf += title "Error: " + test.title +  "\n"
      buf += "\n```\n"
      buf += test.message + "\n"
      buf += "```\n\n"
      level--


module.exports = MarkdownReporter
