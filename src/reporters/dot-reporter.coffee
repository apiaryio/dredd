logger = require './../logger'

class DotReporter
  constructor: (emitter, stats, tests) ->
    @type = "dot"
    @stats = stats
    @tests = tests
    @configureEmitter emitter

  configureEmitter: (emitter) =>
    emitter.on 'start', =>
      logger.info 'Beginning Dredd testing...'

    emitter.on 'end', =>
      if @stats.tests > 0
        process.stdout.write "\n"
        logger.complete "#{@stats.passes} passing, #{@stats.failures} failing, #{@stats.errors} errors, #{@stats.skipped} skipped"
        logger.complete "Tests took #{@stats.duration}ms"

    emitter.on 'test pass', (test) =>
      process.stdout.write "."

    emitter.on 'test skip', (test) =>
      process.stdout.write "-"

    emitter.on 'test fail', (test) =>
      process.stdout.write "F"

    emitter.on 'test error', (test, error) =>
      process.stdout.write "E"

module.exports = DotReporter
