{assert} = require 'chai'
sinon = require 'sinon'
proxyquire = require('proxyquire').noCallThru()

{EventEmitter} = require 'events'
loggerStub = require '../../../src/logger'
CliReporter = proxyquire '../../../src/reporters/cli-reporter', {
  './../logger' : loggerStub
}

# supress output in tests
loggerStub.transports.console.silent = true

describe 'CliReporter', () ->

  test = {}

  describe 'when starting', () ->

    beforeEach () ->
       sinon.spy loggerStub, 'info'

    afterEach () ->
      loggerStub.info.restore()

    it 'should write starting to the console', (done) ->
      emitter = new EventEmitter()
      cliReporter = new CliReporter(emitter, {}, {}, true)
      emitter.emit 'start'
      assert.ok loggerStub.info.calledOnce
      done()

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
      emitter = new EventEmitter()
      cliReporter = new CliReporter(emitter, {}, {}, true)
      emitter.emit 'test pass', test
      assert.ok loggerStub.pass.calledOnce
      done()

    describe 'when details=true', () ->

      beforeEach () ->
        sinon.spy loggerStub, 'request'

      afterEach () ->
        loggerStub.request.restore()

      it 'should write details for passing tests', (done) ->
        emitter = new EventEmitter()
        cliReporter = new CliReporter(emitter, {}, {}, true, true)
        emitter.emit 'test pass', test
        assert.ok loggerStub.request.calledOnce
        done()

  describe 'when adding failing test', () ->

    before () ->
      test =
        status: 'fail'
        title: 'Failing Test'

    describe 'when errors are inline', () ->

      beforeEach () ->
        sinon.spy loggerStub, 'fail'

      afterEach () ->
        loggerStub.fail.restore()

      it 'should write fail to the console', (done) ->
        emitter = new EventEmitter()
        cliReporter = new CliReporter(emitter, {}, {}, true)
        emitter.emit 'test fail', test
        assert.ok loggerStub.fail.calledTwice
        done()

    describe 'when errors are aggregated', () ->

      beforeEach () ->
        sinon.spy loggerStub, 'fail'

      afterEach () ->
        loggerStub.fail.restore()

      it 'should not write full failure to the console at the time of failure', (done) ->
        emitter = new EventEmitter()
        cliReporter = new CliReporter(emitter, {}, {}, false)
        emitter.emit 'test fail', test
        assert.ok loggerStub.fail.calledOnce
        done()

      it 'should write full failure to the console after execution is complete', (done) ->
        emitter = new EventEmitter()
        cliReporter = new CliReporter(emitter, {}, {}, false)
        cliReporter.errors = [ test ]
        emitter.emit 'end', () ->
          assert.ok loggerStub.fail.calledTwice
          done()

  describe 'when adding error test', () ->

    before () ->
      test =
        status: 'error'
        title: 'Error Test'

    beforeEach () ->
      sinon.spy loggerStub, 'error'

    afterEach () ->
      loggerStub.error.restore()

    it 'should write error to the console', (done) ->
      emitter = new EventEmitter()
      cliReporter = new CliReporter(emitter, {}, {}, false)
      emitter.emit 'test error', new Error('Error'), test
      assert.ok loggerStub.error.calledTwice
      done()

  describe 'when adding skipped test', () ->

    before () ->
      test =
        status: 'skip'
        title: 'Skipped Test'

    beforeEach () ->
      sinon.spy loggerStub, 'skip'

    afterEach () ->
      loggerStub.skip.restore()

    it 'should write skip to the console', (done) ->
      emitter = new EventEmitter()
      cliReporter = new CliReporter(emitter, {}, {}, false)
      emitter.emit 'test skip', test
      assert.ok loggerStub.skip.calledOnce
      done()

  describe 'when creating report', () ->

    before () ->
      test =
        status: 'fail'
        title: 'Failing Test'

    beforeEach () ->
       sinon.spy loggerStub, 'complete'

    afterEach () ->
      loggerStub.complete.restore()

    describe 'when there is at least one test', () ->

      it 'should write to the console', (done) ->
        emitter = new EventEmitter()
        cliReporter = new CliReporter(emitter, {}, {}, false)
        cliReporter.tests = [ test ]
        cliReporter.stats.tests = 1
        emitter.emit 'end', () ->
          assert.ok loggerStub.complete.calledTwice
          done()

    describe 'when there are no tests', () ->

      it 'should write to the console', (done) ->
        emitter = new EventEmitter()
        cliReporter = new CliReporter(emitter, {}, {}, false)
        emitter.emit 'end', () ->
          assert.ok loggerStub.complete.calledOnce
          done()








