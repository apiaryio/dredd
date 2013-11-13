uuid = require 'node-uuid'
async = require 'async'

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

  _booleanResult: () =>
    ! (@stats['failures'] > 0)

  start: (opts, callback) => 

    if @endedAt  != undefined or @booleanResult != undefined
      err = new Error "Can't start ended test run. Reporter property 'endedAt' or 'booleanResult' is not null"
      return callback(err)
    
    @rawBlueprint = opts['rawBlueprint']
    @uuid = uuid.v4()
    @startedAt = new Date().getTime() / 1000

    iterator = (childReporter, callback) ->
      childReporter.start opts, (error) ->
        if error
          callback error
        else
          callback()

    async.eachSeries @reporters, iterator, (error) =>
      if error
        callback error
      else
        callback()

  addTest: (test, callback) =>
    if @endedAt  != undefined or @booleanResult != undefined
      err = new Error "Can't start ended test run. Reporter property 'endedAt' or 'booleanResult' is not null"
      return callback(err)
    

    @tests.push(test)
    @stats.tests += 1

    switch test.status
      when 'pass'
        @stats.passes += 1
      when 'fail'
        @stats.failures += 1
      else
        return callback(new Error "Error adding test: must have status of pass or fail.")

    iterator = (childReporter, callback) ->
      childReporter.addTest test, (error) ->
        if error
          callback error
        else
          callback()

    async.eachSeries @reporters, iterator, (error) =>
      if error
        callback error
      else
        callback()

  createReport: (callback) =>
    @endedAt = new Date().getTime() / 1000
    @booleanResult = @_booleanResult()

    iterator = (reporter, callback) ->
      reporter.createReport (error) ->
        if error
          callback error
        else
          callback()

    async.eachSeries @reporters, iterator, (error) ->
      if error 
        return callback error
      else
        return callback()

  addReporter: (reporter) =>
    @reporters.push reporter
    return this


module.exports = Reporter
