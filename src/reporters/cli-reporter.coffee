logger = require './../logger'

class CliReporter
  constructor: (emitter, stats, tests, inlineErrors, details) ->
    @type = "cli"
    @stats = stats
    @tests = tests
    @configureEmitter emitter
    @inlineErrors = inlineErrors
    @details = details
    @errors = []

  configureEmitter: (emitter) =>
    emitter.on 'start', =>
      logger.info 'Beginning Dredd testing...'

    emitter.on 'end', (callback) =>
      if not @inlineErrors
        logger.info "Displaying failed tests..." unless @errors.length is 0
        for test in @errors
          logger.fail test.title + " duration: #{test.duration}ms"
          logger.fail test.message
          logger.request "\n" + (JSON.stringify test.request, null, 4) + "\n"
          logger.expected "\n" + (JSON.stringify test.expected, null, 4) + "\n"
          logger.actual "\n" + (JSON.stringify test.actual, null, 4) + "\n\n"
      if @stats.tests > 0
        logger.complete "#{@stats.passes} passing, #{@stats.failures} failing, #{@stats.errors} errors, #{@stats.skipped} skipped"
      logger.complete "Tests took #{@stats.duration}ms"
      callback()

    emitter.on 'test pass', (test) =>
      logger.pass test.title + " duration: #{test.duration}ms"
      if @details
        logger.request "\n" + (JSON.stringify test.request, null, 4) + "\n"
        logger.expected "\n" + (JSON.stringify test.expected, null, 4) + "\n"
        logger.actual "\n" + (JSON.stringify test.actual, null, 4) + "\n\n"

    emitter.on 'test skip', (test) =>
      logger.skip test.title

    emitter.on 'test fail', (test) =>
      logger.fail test.title + " duration: #{test.duration}ms"
      if @inlineErrors
        logger.fail test.message
        logger.request "\n" + (JSON.stringify test.request, null, 4) + "\n"
        logger.expected "\n" + (JSON.stringify test.expected, null, 4) + "\n"
        logger.actual "\n" + (JSON.stringify test.actual, null, 4) + "\n\n"
      else
        @errors.push test

    emitter.on 'test error', (error, test) =>
      if not @inlineErrors
        @errors.push test
      logger.error test.title  + " duration: #{test.duration}ms"
      logger.error error.stack

module.exports = CliReporter
