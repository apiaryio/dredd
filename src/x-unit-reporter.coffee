fs = require 'fs'
cli = require 'cli'

class xUnitReporter
  constructor: (path) ->
    @tests = []
    @path = process.cwd() + "/report.xml" unless path?
    @stats =
      tests: 0
      failures: 0
      passes: 0
      timestamp: (new Date).toUTCString()
      duration: 0
    #delete old results
    fs.unlinkSync(@path) if fs.existsSync(@path)

  addTest: (test) =>
    cli.debug "Adding test to junit reporter: " + JSON.stringify(test)
    @tests.push(test)
    @stats.tests += 1
    switch test.status
      when 'pass'
        @stats.passes += 1
      when 'fail'
        @stats.failures += 1
    return this

  createReport: =>
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
    return this

  doTest = (path, test) ->
    attrs =
      classname: test.title
      name: test.title
      time: test.duration ? test.duration / 1000 : 0

    if 'fail' is test.status
      attrs.message = test.message
      appendLine(path, toTag('testcase', attrs, false, toTag('failure', attrs, false, cdata(test.errorMessage))))
    else
      appendLine(path, toTag('testcase', attrs, true) )

  cdata = (str) ->
    return '<![CDATA[' + escape(str) + ']]>'

  appendLine = (path, line) ->
    fs.appendFileSync(path, line + "\n")

  toTag = (name, attrs, close, content) ->
    end = (if close then "/>" else ">")
    pairs = []
    tag = undefined
    for key of attrs
      pairs.push key + "=\"" + escape(attrs[key]) + "\""
    tag = "<" + name + ((if pairs.length then " " + pairs.join(" ") else "")) + end
    tag += content + "</" + name + end  if content
    tag

module.exports = xUnitReporter
