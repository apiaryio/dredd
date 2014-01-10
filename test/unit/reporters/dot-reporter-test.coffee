{assert} = require 'chai'
sinon = require 'sinon'
proxyquire = require('proxyquire').noCallThru()

{EventEmitter} = require 'events'
loggerStub = require '../../../src/logger'
DotReporter = proxyquire '../../../src/reporters/dot-reporter', {
  './../logger' : loggerStub
}

emitter = new EventEmitter()
stats =
  tests: 0
  failures: 0
  errors: 0
  passes: 0
  skipped: 0
  start: 0
  end: 0
  duration: 0
tests = []
dotReporter = new DotReporter(emitter, stats, tests)

describe 'DotReporter', () ->

  describe 'when starting', () ->

    beforeEach () ->
      sinon.spy loggerStub, 'info'

    afterEach () ->
      loggerStub.info.restore()

    it 'should log that testing has begun', (done) ->
      emitter.emit 'start'
      assert.ok loggerStub.info.called
      done()

  describe 'when ending', () ->

    before () ->
      stats.tests = 1

    beforeEach () ->
      sinon.spy loggerStub, 'complete'
      sinon.stub dotReporter, 'write'

    afterEach () ->
      loggerStub.complete.restore()
      dotReporter.write.restore()

    it 'should log that testing is complete', (done) ->
      emitter.emit 'end'
      assert.ok loggerStub.complete.calledTwice
      done()

    describe 'when there are failures', () ->

      before () ->
        test =
          status: 'fail'
          title: 'failing test'
        dotReporter.errors = [test]
        dotReporter.stats.tests = 1
        emitter.emit 'test start', test

      beforeEach () ->
        sinon.spy loggerStub, 'fail'

      afterEach () ->
        loggerStub.fail.restore()

      it 'should log the failures at the end of testing', (done) ->
        emitter.emit 'end'
        assert.ok loggerStub.fail.called
        done()

  describe 'when test passes', () ->

    before () ->
      test =
        status: 'pass'
        title: 'Passing Test'
      sinon.stub dotReporter, 'write'
      emitter.emit 'test start', test
      emitter.emit 'test pass', test

    after () ->
      dotReporter.write.restore()

    it 'should write a .', (done) ->
      assert.ok dotReporter.write.calledWith '.'
      done()

  describe 'when test is skipped', () ->
    before () ->
      test =
        status: 'skipped'
        title: 'Skipped Test'
      sinon.stub dotReporter, 'write'
      emitter.emit 'test start', test
      emitter.emit 'test skip', test

    after () ->
      dotReporter.write.restore()

    it 'should write a -', (done) ->
      assert.ok dotReporter.write.calledWith('-')
      done()

  describe 'when test fails', () ->

    before () ->
      test =
        status: 'failed'
        title: 'Failed Test'
      sinon.stub dotReporter, 'write'
      emitter.emit 'test start', test
      emitter.emit 'test fail', test

    after () ->
      dotReporter.write.restore()

    it 'should write an F', (done) ->
      assert.ok dotReporter.write.calledWith('F')
      done()

  describe 'when test errors', () ->

    before () ->
      test =
        status: 'error'
        title: 'Errored Test'
      sinon.stub dotReporter, 'write'
      emitter.emit 'test start', test
      emitter.emit 'test error', test, new Error('Error')

    after () ->
      dotReporter.write.restore()

    it 'should write an E', (done) ->
      assert.ok dotReporter.write.calledWith('E')
      done()

