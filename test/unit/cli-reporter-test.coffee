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

    beforeEach () ->
       sinon.spy cliStub, 'ok'

    afterEach () ->
      cliStub.ok.restore()

    it 'should write pass to the console', (done) ->
      cliReporter = new CliReporter()
      cliReporter.addTest test, () ->
        assert.ok cliStub.ok.calledOnce
        done()

  describe 'when adding failing test', () ->
    before () ->
      test =
        status: 'fail'
        title: 'Failing Test'

    beforeEach () ->
      sinon.spy cliStub, 'error'

    afterEach () ->
      cliStub.error.restore()

    it 'should write fail to the console', (done) ->
      cliReporter = new CliReporter()
      cliReporter.addTest test, ()->
        assert.ok cliStub.error.calledOnce
        done()


  describe 'when creating report', () ->
    beforeEach () ->
       sinon.spy cliStub, 'info'

    afterEach () ->
      cliStub.info.restore()

    describe 'when there is at least one test', () ->

      it 'should write to the console', (done) ->
        cliReporter = new CliReporter()
        cliReporter.addTest test, () ->
          cliReporter.createReport () ->
            assert.ok cliStub.info.calledTwice
            done()

    describe 'when there are no tests', () ->

      it 'should write to the console', (done) ->
        cliReporter = new CliReporter()
        cliReporter.createReport () ->
          assert.notOk cliStub.info.calledOnce
          done()








