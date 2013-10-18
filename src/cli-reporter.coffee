cli = require 'cli'
Reporter = require './reporter'

class CliReporter extends Reporter
  constructor: (path) ->
    super()
    @type = "cli"

  addTest: (test, callback) =>
    super test, (error) ->
      return callback(error) if error

    switch test.status
      when 'pass'
        cli.ok test.title
      when 'fail'
        cli.error test.title

    cli.info test.message

    return callback()

  createReport: (callback) =>
    super (error) ->
      return callback(error) if error

    if @stats.tests > 0
      cli.info "Tests Complete\n" \
        + "tests:  #{@stats.tests} \n" \
        + "failures: #{@stats.failures} \n" \
        + "errors: #{@stats.failures} \n" \
        + "skip: #{@stats.tests - @stats.failures - @stats.passes} \n" \
        + "timestamp: #{(new Date).toUTCString()} \n" \
        + "time: #{@stats.duration / 1000} \n"
    return callback()

module.exports = CliReporter
