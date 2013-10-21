{assert} = require 'chai'
sinon = require 'sinon'
proxyquire = require('proxyquire').noCallThru()

loggerStub = require '../../src/logger'
CliReporter = proxyquire '../../src/cli-reporter', {
  'winston' : loggerStub
}

describe 'CliReporter', () ->

  test = {}

  describe 'when adding passing test', () ->
    before () ->
      test =
        status: 'pass'
        title: 'Passing Test'

    beforeEach () ->
       sinon.spy loggerStub, 'pass'

    afterEach () ->
      loggerStub.pass.restore()

    it 'should write pass to the console', (done) ->
      cliReporter = new CliReporter()
      cliReporter.addTest test, () ->
        assert.ok loggerStub.pass.calledOnce
        done()

  describe 'when adding failing test', () ->
    before () ->
      test =
        status: 'fail'
        title: 'Failing Test'

    beforeEach () ->
      sinon.spy loggerStub, 'fail'

    afterEach () ->
      loggerStub.fail.restore()

    it 'should write fail to the console', (done) ->
      cliReporter = new CliReporter()
      cliReporter.addTest test, ()->
        assert.ok loggerStub.fail.called
        done()


  describe 'when creating report', () ->
    beforeEach () ->
       sinon.spy loggerStub, 'complete'

    afterEach () ->
      loggerStub.complete.restore()

    describe 'when there is at least one test', () ->

      it 'should write to the console', (done) ->
        cliReporter = new CliReporter()
        cliReporter.addTest test, () ->
          cliReporter.createReport () ->
            assert.ok loggerStub.complete.calledOnce
            done()

    describe 'when there are no tests', () ->

      it 'should write to the console', (done) ->
        cliReporter = new CliReporter()
        cliReporter.createReport () ->
          assert.notOk loggerStub.complete.calledOnce
          done()








