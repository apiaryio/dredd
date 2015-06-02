{EventEmitter} = require 'events'
fs = require 'fs'

htmlencode = require 'htmlencode'
file = require 'file'

logger = require './../logger'
prettifyResponse = require './../prettify-response'

class XUnitReporter extends EventEmitter
  constructor: (emitter, stats, tests, path, details) ->
    super()
    @type = "xUnit"
    @stats = stats
    @tests = tests
    @path = @sanitizedPath(path)
    @details = details
    @configureEmitter emitter

  sanitizedPath: (path) ->
    filePath = if path? then file.path.abspath(path) else file.path.abspath("./report.xml")
    if fs.existsSync(filePath)
      logger.info "File exists at #{filePath}, will be overwritten..."
      fs.unlinkSync(filePath)
    filePath

  configureEmitter: (emitter) =>
    emitter.on 'start', (rawBlueprint, callback) =>
      appendLine @path, toTag('testsuite', {
        name: 'Dredd Tests'
        tests: @stats.tests
        failures: @stats.failures
        errors: @stats.errors
        skip: @stats.skipped
        timestamp: (new Date()).toUTCString()
        time: @stats.duration / 1000
      }, false)
      callback()

    emitter.on 'end', (callback) =>
      updateSuiteStats @path, @stats, callback

    emitter.on 'test pass', (test) =>
      attrs =
        name: htmlencode.htmlEncode test.title
        time: test.duration / 1000
      if @details
        deets = """
        \nRequest:
        #{prettifyResponse(test.request)}
        Expected:
        #{prettifyResponse(test.expected)}
        Actual:
        #{prettifyResponse(test.actual)}
        """
        appendLine @path, toTag('testcase', attrs, false, toTag('system-out', null, false, cdata(deets)))
      else
        appendLine @path, toTag('testcase', attrs, true)

    emitter.on 'test skip', (test) =>
      attrs =
        name: htmlencode.htmlEncode test.title
        time: test.duration / 1000
      appendLine @path, toTag('testcase', attrs, false, toTag('skipped', null, true))

    emitter.on 'test fail', (test) =>
      attrs =
        name: htmlencode.htmlEncode test.title
        time: test.duration / 1000
      diff = """
      Message:
      #{test.message}
      Request:
      #{prettifyResponse(test.request)}
      Expected:
      #{prettifyResponse(test.expected)}
      Actual:
      #{prettifyResponse(test.actual)}
      """
      appendLine @path, toTag('testcase', attrs, false, toTag('failure', null, false, cdata(diff)))

    emitter.on 'test error', (error, test) =>
      attrs =
        name: htmlencode.htmlEncode test.title
        time: test.duration / 1000
      errorMessage = "\nError: \n"  + error + "\nStacktrace: \n" + error.stack
      appendLine @path, toTag('testcase', attrs, false, toTag('failure', null, false, cdata(errorMessage)))

  updateSuiteStats = (path, stats, callback) ->
    fs.readFile path, (err, data) ->
      if !err
        data = data.toString()
        position = data.toString().indexOf('\n')
        if (position != -1)
          restOfFile = data.substr position + 1
          newStats = toTag 'testsuite', {
            name: 'Dredd Tests'
            tests: stats.tests
            failures: stats.failures
            errors: stats.errors
            skip: stats.skipped
            timestamp: (new Date()).toUTCString()
            time: stats.duration / 1000
          }, false
          xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>'
          fs.writeFile path, xmlHeader + '\n' + newStats + '\n' + restOfFile + '</testsuite>', (err) ->
            logger.error err if err
            callback()
        else
          callback()
      else
        logger.error err
        callback()

  cdata = (str) ->
    return '<![CDATA[' + str + ']]>'

  appendLine = (path, line) ->
    fs.appendFileSync path, line + "\n"

  toTag = (name, attrs, close, content) ->
    end = (if close then "/>" else ">")
    pairs = []
    tag = undefined
    for key of attrs
      pairs.push key + "=\"" + attrs[key] + "\""
    tag = "<" + name + ((if pairs.length then " " + pairs.join(" ") else "")) + end
    tag += content + "</" + name + end  if content
    tag

module.exports = XUnitReporter
