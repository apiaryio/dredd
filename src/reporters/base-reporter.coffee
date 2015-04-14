class BaseReporter
  constructor: (emitter, stats, tests) ->
    @type = "base"
    @stats = stats
    @tests = tests
    @configureEmitter emitter

  configureEmitter: (emitter) =>
    emitter.on 'start', (rawBlueprint, callback) =>
      @stats.start = new Date()
      callback()

    emitter.on 'end', (callback) =>
      @stats.end = new Date()
      @stats.duration = @stats.end - @stats.start
      callback()

    emitter.on 'test start', (test) =>
      @tests.push(test)
      @stats.tests += 1
      test['start'] = new Date()

    emitter.on 'test pass', (test) =>
      @stats.passes += 1
      test['end'] = new Date()
      test['duration'] = test.end - test.start

    emitter.on 'test skip', (test) =>
      @stats.skipped += 1

    emitter.on 'test fail', (test) =>
      @stats.failures += 1
      test['end'] = new Date()
      test['duration'] = test.end - test.start

    emitter.on 'test error', (error, test) =>
      @stats.errors += 1
      test['end'] = new Date()
      test['duration'] = test.end - test.start

module.exports = BaseReporter
