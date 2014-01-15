logger = require './../logger'

class DotReporter
  constructor: (emitter, stats, tests, details) ->
    @type = "dot"
    @stats = stats
    @tests = tests
    @configureEmitter emitter
    @errors = []

  configureEmitter: (emitter) =>
    emitter.on 'start', =>
      logger.info 'Beginning Dredd testing...'

    emitter.on 'end', =>
      if @stats.tests > 0
        if @errors.length > 0
          @write "\n"
          logger.info "Displaying failed tests..."
          for test in @errors
            logger.fail test.title + " duration: #{test.duration}ms"
            logger.fail test.message
            logger.request "\n" + (JSON.stringify test.request, null, 4) + "\n"
            logger.expected "\n" + (JSON.stringify test.expected, null, 4) + "\n"
            logger.actual "\n" + (JSON.stringify test.actual, null, 4) + "\n\n"
        @write "\n"
        logger.complete "#{@stats.passes} passing, #{@stats.failures} failing, #{@stats.errors} errors, #{@stats.skipped} skipped"
        logger.complete "Tests took #{@stats.duration}ms"

    emitter.on 'test pass', (test) =>
      @write "."

    emitter.on 'test skip', (test) =>
      @write "-"

    emitter.on 'test fail', (test) =>
      @write "F"
      @errors.push test

    emitter.on 'test error', (error, test) =>
      @write "E"
      test.message = "\nError: \n"  + error + "\nStacktrace: \n" + error.stack + "\n"
      @errors.push test

  write: (str) ->
    process.stdout.write str

module.exports = DotReporter
