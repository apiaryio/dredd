{assert} = require 'chai'
sinon = require 'sinon'

Reporter = require '../../src/reporter'

describe 'Reporter', () ->

  test = {}

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
      sinon.spy child, 'addTest'
      sinon.spy child, 'createReport'

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


  describe 'when creating report', () ->
    describe 'when there is at least one test', () ->

