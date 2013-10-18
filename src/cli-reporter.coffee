logger = require './logger'
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
        logger.pass test.title
      when 'fail'
        logger.fail test.title

    logger.info test.message

    return callback()

  createReport: (callback) =>
    super (error) ->
      return callback(error) if error

    if @stats.tests > 0
      logger.complete "Tests Complete\n" \
        + "tests:  #{@stats.tests} \n" \
        + "failures: #{@stats.failures} \n" \
        + "errors: #{@stats.failures} \n" \
        + "skip: #{@stats.tests - @stats.failures - @stats.passes} \n" \
        + "timestamp: #{(new Date).toUTCString()} \n" \
        + "time: #{@stats.duration / 1000} \n"
    return callback()

module.exports = CliReporter
