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
        logger.fail test.message
        logger.request "\n" + (JSON.stringify test.request, null, 4) + "\n"
        logger.expected "\n" + (JSON.stringify test.expected, null, 4) + "\n"
        logger.actual "\n" + (JSON.stringify test.actual, null, 4) + "\n\n"

    return callback()

  createReport: (callback) =>
    super (error) ->
      return callback(error) if error

    if @stats.tests > 0
      logger.complete "#{@stats.passes} passing, #{@stats.failures} failing, #{@stats.tests - @stats.failures - @stats.passes} skipped"
    return callback()

module.exports = CliReporter
