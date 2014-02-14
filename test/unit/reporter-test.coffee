{assert} = require 'chai'
sinon = require 'sinon'

Reporter = require '../../src/reporter'

describe 'Reporter', () ->

  test = {}

  describe 'when starting', (done) ->
    reporter = null
    blueprint = "My Api \n#My resource [/resource]\n# Action [GET]"

    before (done) ->
      reporter = new Reporter
      reporter.start rawBlueprint: blueprint, done

    it 'should generate set UUID', () ->
      assert.isDefined reporter.uuid
    
    it 'should set start time', () ->
      assert.isNumber reporter.startedAt

    it 'should set raw blueprint to the report', () ->
      assert.isDefined reporter.rawBlueprint

    it 'should pass error to callback if endedAt is defined', (done) ->
      reporter = new Reporter 
      reporter.endedAt = new Date().getTime() / 1000
      reporter.start rawBlueprint: blueprint, (err) ->
        assert.instanceOf err, Error
        done()
      
    it 'should pass error to callback if booleanResult is defined', (done) ->
      reporter = new Reporter 
      reporter.booleanResult = false
      reporter.start rawBlueprint: blueprint, (err) ->
        assert.instanceOf err, Error
        done()

    
  describe 'when creating report', () ->
    reporter = null
    
    before (done) ->
      reporter = new Reporter
      reporter.stats =
        failures: 666
      reporter.createReport(done)

    it 'should set end time', () ->
      assert.isNumber reporter.endedAt
    
    it 'should set boolean result', () ->
      assert.isBoolean reporter.booleanResult

  describe 'booleanResult', () ->
    reporter = null

    before () ->
      reporter = new Reporter
    
    describe 'when any step failure occurs', () ->  
      it 'should set false', () ->
        reporter.stats = 
          failures: 666
        assert.isFalse reporter._booleanResult()


    describe 'when no step failure', () ->
      it 'shuold set true', () ->
        reporter.stats =
          failures: 0
        assert.isTrue reporter._booleanResult()

  describe 'when trying to add test after report created', () ->
    it 'should pass error to callback', (done) ->
      test =
        status: 'pass'
        title: 'Passing Test'
      reporter = new Reporter 
      reporter.booleanResult = false
      
      reporter.addTest test, (err) ->
        assert.instanceOf err, Error
        done()      


  describe 'when adding passing test', () ->
    before () ->
      test =
        status: 'pass'
        title: 'Passing Test'

    it 'should add to the list of passing tests', (done) ->
      reporter = new Reporter()
      reporter.addTest test, () ->
        assert.includeMembers(reporter.tests, [test])
        done()

    it 'should increment the correct counters', (done) ->
      reporter = new Reporter()
      reporter.addTest test, () ->
        assert.equal(reporter.stats.tests, 1)
        assert.equal(reporter.stats.passes, 1)
        assert.equal(reporter.stats.failures, 0)
        done()

  describe 'when adding failing test', () ->
    before () ->
      test =
        status: 'fail'
        title: 'Failing Test'

    it 'should add to the list of failing tests', (done) ->
      reporter = new Reporter()
      reporter.addTest test, ()->
        assert.includeMembers(reporter.tests, [test])
        done()

    it 'should increment the correct counters', (done) ->
      reporter = new Reporter()
      reporter.addTest test, () ->
        assert.equal(reporter.stats.tests, 1)
        assert.equal(reporter.stats.passes, 0)
        assert.equal(reporter.stats.failures, 1)
        done()

  describe 'when adding invalid test', () ->
    before () ->
      test =
        status: 'foo'

    it 'should exit with an error', (done) ->
      reporter = new Reporter()
      reporter.addTest test, (error) ->
        assert.ok error
        done()

  describe 'when has child reporters', () ->
    child = null

    before () ->
      test =
        status: 'pass'

      child = new Reporter()
      sinon.spy child, 'start'
      sinon.spy child, 'addTest'
      sinon.spy child, 'createReport'

    it 'should run start on children', (done) ->
      reporter = new Reporter()
      reporter.addReporter(child)
      reporter.start rawBlueprint: 'blueprint source', () ->
        assert.ok child.start.calledOnce
        done()

    it 'should add tests to children', (done) ->
      reporter = new Reporter()
      reporter.addReporter(child)
      reporter.addTest test, () ->
        assert.ok child.addTest.calledOnce
        done()

    it 'should create reports on children', (done) ->
      reporter = new Reporter()
      reporter.addReporter(child)
      reporter.createReport () ->
        assert.ok child.createReport.calledOnce
        done()

