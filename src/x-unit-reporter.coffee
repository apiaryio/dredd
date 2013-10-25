fs = require 'fs'
cli = require 'cli'
Reporter = require './reporter'
htmlencode = require 'htmlencode'

class XUnitReporter extends Reporter
  constructor: (path) ->
    super()
    @type = "xUnit"
    @path = process.cwd() + "/report.xml" unless path?
    #delete old results
    fs.unlinkSync(@path) if fs.existsSync(@path)

  addTest: (test, callback) =>
    super test, (error) ->
      return callback(error) if error
    cli.debug "Adding test to junit reporter: " + JSON.stringify(test)
    return callback()

  createReport: (callback) =>
    super (error) ->
      return callback(error) if error

    cli.debug "Writing junit tests to file: " + @path
    appendLine @path, toTag('testsuite', {
        name: 'Dredd Tests'
      , tests: @stats.tests
      , failures: @stats.failures
      , errors: @stats.failures
      , skip: @stats.tests - @stats.failures - @stats.passes
      , timestamp: (new Date).toUTCString()
      , time: @stats.duration / 1000
    }, false)
    doTest @path, test for test in @tests
    appendLine(@path, '</testsuite>')

    return callback()

  doTest = (path, test) ->
    attrs =
      name: htmlencode.htmlEncode test.title
      time: 0

    if 'fail' is test.status
      diff = "Message: \n" + test.message + "\nExpected: \n" +  (JSON.stringify test.expected, null, 4) + "\nActual:\n" + (JSON.stringify test.actual, null, 4)
      appendLine(path, toTag('testcase', attrs, false, toTag('failure', null, false, cdata(diff))))
    else
      appendLine(path, toTag('testcase', attrs, true) )

  cdata = (str) ->
    return '<![CDATA[' + str + ']]>'

  appendLine = (path, line) ->
    fs.appendFileSync(path, line + "\n")

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
