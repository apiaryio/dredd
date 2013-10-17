{assert} = require 'chai'
sinon = require 'sinon'
proxyquire = require('proxyquire').noCallThru()

cliStub = require 'cli'
CliReporter = proxyquire '../../src/cli-reporter', {
  'cli' : cliStub
}

describe 'CliReporter', () ->

  test = {}

  describe 'when adding passing test', () ->
    before () ->
      test =
        status: 'pass'
        title: 'Passing Test'

    it 'should add to the list of passing tests', () ->
      cliReporter = new CliReporter()
      cliReporter.addTest(test)
      assert.includeMembers(cliReporter.tests, [test])

    it 'should increment the correct counters', () ->
      cliReporter = new CliReporter()
      cliReporter.addTest(test)
      assert.equal(cliReporter.stats.tests, 1)
      assert.equal(cliReporter.stats.passes, 1)
      assert.equal(cliReporter.stats.failures, 0)

  describe 'when adding failing test', () ->
    before () ->
      test =
        status: 'fail'
        title: 'Failing Test'

    it 'should add to the list of failing tests', () ->
      cliReporter = new CliReporter()
      cliReporter.addTest(test)
      assert.includeMembers(cliReporter.tests, [test])

    it 'should increment the correct counters', () ->
      cliReporter = new CliReporter()
      cliReporter.addTest(test)
      assert.equal(cliReporter.stats.tests, 1)
      assert.equal(cliReporter.stats.passes, 0)
      assert.equal(cliReporter.stats.failures, 1)


  describe 'when creating report', () ->
    beforeEach () ->
       sinon.spy cliStub, 'info'

    afterEach () ->
      cliStub.info.restore()

    describe 'when there is at least one test', () ->

      it 'should write to the console', () ->
        cliReporter = new CliReporter()
        cliReporter.addTest(test)
        cliReporter.createReport()
        assert.ok cliStub.info.calledTwice

    describe 'when there are no tests', () ->

      it 'should write to the console', () ->
        cliReporter = new CliReporter()
        cliReporter.createReport()
        assert.notOk cliStub.info.calledOnce








