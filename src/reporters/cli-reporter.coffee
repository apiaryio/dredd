logger = require './../logger'
prettifyResponse = require './../prettify-response'

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
    emitter.on 'start', (rawBlueprint, callback) ->
      logger.info 'Beginning Dredd testing...'
      callback()

    emitter.on 'end', (callback) =>
      if not @inlineErrors
        logger.info "Displaying failed tests..." unless @errors.length is 0
        for test in @errors
          logger.fail test.title + " duration: #{test.duration}ms"
          logger.fail test.message
          logger.request "\n" + prettifyResponse(test.request) + "\n" if test.request
          logger.expected "\n" + prettifyResponse(test.expected) + "\n" if test.expected
          logger.actual "\n" + prettifyResponse(test.actual) + "\n\n" if test.actual
      if @stats.tests > 0
        logger.complete "#{@stats.passes} passing, " +
          "#{@stats.failures} failing, " +
          "#{@stats.errors} errors, " +
          "#{@stats.skipped} skipped, " +
          "#{@stats.tests} total"

      logger.complete "Tests took #{@stats.duration}ms"
      callback()

    emitter.on 'test pass', (test) =>
      logger.pass test.title + " duration: #{test.duration}ms"
      if @details
        logger.request "\n" + prettifyResponse(test.request) + "\n"
        logger.expected "\n" + prettifyResponse(test.expected) + "\n"
        logger.actual "\n" + prettifyResponse(test.actual) + "\n\n"

    emitter.on 'test skip', (test) ->
      logger.skip test.title

    emitter.on 'test fail', (test) =>
      logger.fail test.title + " duration: #{test.duration}ms"
      if @inlineErrors
        logger.fail test.message
        logger.request "\n" + prettifyResponse(test.request) + "\n" if test.request
        logger.expected "\n" + prettifyResponse(test.expected) + "\n" if test.expected
        logger.actual "\n" + prettifyResponse(test.actual) + "\n\n" if test.actual
      else
        @errors.push test

    emitter.on 'test error', (error, test) =>
      connectionErrors = ['ECONNRESET', 'ENOTFOUND', 'ESOCKETTIMEDOUT', 'ETIMEDOUT', 'ECONNREFUSED', 'EHOSTUNREACH', 'EPIPE']
      if connectionErrors.indexOf(error.code) > -1
        test.message = "Error connecting to server under test!"

      if not @inlineErrors
        @errors.push test

      logger.error test.title  + " duration: #{test.duration}ms"

      if connectionErrors.indexOf(error.code) > -1
        logger.error test.message
      else
        logger.error error.stack

module.exports = CliReporter
