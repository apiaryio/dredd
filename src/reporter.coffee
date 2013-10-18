class Reporter
  constructor: ->
    @reporters = []
    @type = "Container"
    @tests = []
    @stats =
      tests: 0
      failures: 0
      passes: 0
      timestamp: (new Date).toUTCString()
      duration: 0

  addTest: (test, callback) =>
    for reporter in @reporters
      reporter.addTest test, (error) ->
        return callback error if error

    @tests.push(test)
    @stats.tests += 1

    switch test.status
      when 'pass'
        @stats.passes += 1
      when 'fail'
        @stats.failures += 1
      else
        return callback(new Error "Error adding test: must have status of pass or fail.")
    return callback()

  createReport: (callback) =>
    for reporter in @reporters
      reporter.createReport (error) ->
        return callback error if error
    return callback()

  addReporter: (reporter) =>
    @reporters.push reporter
    return this


module.exports = Reporter
