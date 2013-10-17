{assert} = require 'chai'
sinon = require 'sinon'
proxyquire = require('proxyquire').noCallThru()

cliStub = require 'cli'
fsStub = require 'fs'

XUnitReporter = proxyquire '../../src/x-unit-reporter', {
  'cli' : cliStub,
  'fs' : fsStub
}

describe 'XUnitReporter', () ->

  test = {}

  describe 'when adding passing test', () ->
    before () ->
      test =
        status: 'pass'
        title: 'Passing Test'

    it 'should add to the list of passing tests', () ->
      xUnitReporter = new XUnitReporter()
      xUnitReporter.addTest(test)
      assert.includeMembers(xUnitReporter.tests, [test])

    it 'should increment the correct counters', () ->
      xUnitReporter = new XUnitReporter()
      xUnitReporter.addTest(test)
      assert.equal(xUnitReporter.stats.tests, 1)
      assert.equal(xUnitReporter.stats.passes, 1)
      assert.equal(xUnitReporter.stats.failures, 0)

  describe 'when adding failing test', () ->
    before () ->
      test =
        status: 'fail'
        title: 'Failing Test'

    it 'should add to the list of failing tests', () ->
      xUnitReporter = new XUnitReporter()
      xUnitReporter.addTest(test)
      assert.includeMembers(xUnitReporter.tests, [test])

    it 'should increment the correct counters', () ->
      xUnitReporter = new XUnitReporter()
      xUnitReporter.addTest(test)
      assert.equal(xUnitReporter.stats.tests, 1)
      assert.equal(xUnitReporter.stats.passes, 0)
      assert.equal(xUnitReporter.stats.failures, 1)

  describe 'when creating report', () ->
    beforeEach () ->
       sinon.spy fsStub, 'appendFileSync'

    afterEach () ->
      fsStub.appendFileSync.restore()

    describe 'when there is one test', () ->

      it 'should write tests to file', () ->
        xUnitReporter = new XUnitReporter()
        xUnitReporter.addTest({ status: 'fail', title: 'Failing Test' })
        xUnitReporter.addTest({ status: 'pass', title: 'Passing Test' })
        xUnitReporter.createReport()
        assert.ok fsStub.appendFileSync.called

    describe 'when there are no tests', () ->

      it 'should write empty suite', () ->
        xUnitReporter = new XUnitReporter()
        xUnitReporter.createReport()
        assert.ok fsStub.appendFileSync.calledTwice
