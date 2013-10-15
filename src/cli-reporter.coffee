cli = require 'cli'

class cliReporter
  constructor: ->
    @tests = []
    @stats =
      tests: 0
      failures: 0
      passes: 0
      timestamp: (new Date).toUTCString()
      duration: 0

  addTest: (test) =>
    @tests.push(test)
    @stats.tests += 1

    cli.info test.message

    switch test.status
      when 'pass'
        @stats.passes += 1
        cli.ok test.title
      when 'fail'
        @stats.failures += 1
        cli.error test.title
    return this

  createReport: =>
    cli.info "Tests Complete\n" \
      + "tests:  #{@stats.tests} \n" \
      + "failures: #{@stats.failures} \n" \
      + "errors: #{@stats.failures} \n" \
      + "skip: #{@stats.tests - @stats.failures - @stats.passes} \n" \
      + "timestamp: #{(new Date).toUTCString()} \n" \
      + "time: #{@stats.duration / 1000} \n"
    return this

module.exports = cliReporter
