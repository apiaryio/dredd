{EventEmitter} = require 'events'
fs = require 'fs'

htmlencode = require 'htmlencode'

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

  sanitizedPath: (path) =>
    filePath = if path? then process.cwd() + "/" +  path else process.cwd() + "/report.xml"
    if fs.existsSync(filePath)
      logger.info "File exists at #{filePath}, deleting..."
      fs.unlinkSync(filePath)
    filePath

  configureEmitter: (emitter) =>
    emitter.on 'start', =>
      appendLine @path, toTag('testsuite', {
              name: 'Dredd Tests'
            , tests: @stats.tests
            , failures: @stats.failures
            , errors: @stats.errors
            , skip: @stats.skipped
            , timestamp: (new Date).toUTCString()
            , time: @stats.duration / 1000
          }, false)

    emitter.on 'end', (callback) =>
      updateSuiteStats @path, @stats, callback

    emitter.on 'test pass', (test) =>
      attrs =
        name: htmlencode.htmlEncode test.title
        time: test.duration / 1000
      if @details
        deets = "\nRequest: \n"  + prettifyResponse(test.request) + "\nExpected: \n" +  prettifyResponse(test.expected) + "\nActual:\n" + prettifyResponse(test.actual)
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
      diff = "Message: \n" + test.message + "\nRequest: \n"  + prettifyResponse(test.request) + "\nExpected: \n" +  prettifyResponse(test.expected) + "\nActual:\n" + prettifyResponse(test.actual)
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
            , tests: stats.tests
            , failures: stats.failures
            , errors: stats.errors
            , skip: stats.skipped
            , timestamp: (new Date).toUTCString()
            , time: stats.duration / 1000
          }, false
          xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>'
          fs.writeFile path, xmlHeader + '\n' + newStats + '\n' + restOfFile + '</testsuite>', (err) ->
            if err
              logger.error err
            callback()
        else
          callback()
      else
        logger.error err
        callback()

  cdata = (str) ->
    return '<![CDATA[' + str + ']]>'

  appendLine = (path, line) ->
    fs.appendFile path, line + "\n", (err) ->
      throw err if err

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
