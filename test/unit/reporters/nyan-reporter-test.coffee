{assert} = require 'chai'
sinon = require 'sinon'
proxyquire = require('proxyquire').noCallThru()

{EventEmitter} = require 'events'
loggerStub = require '../../../src/logger'
NyanCatReporter = proxyquire '../../../src/reporters/nyan-reporter', {
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
nyanReporter = new NyanCatReporter(emitter, stats, tests)

describe 'NyanCatReporter', () ->

  describe 'when starting', () ->

    beforeEach () ->
      sinon.spy nyanReporter, 'cursorHide'
      sinon.stub(nyanReporter, 'draw', ()->)

    afterEach () ->
      nyanReporter.cursorHide.restore()
      nyanReporter.draw.restore()

    it 'should hide the cursor and draw the cat', (done) ->
      emitter.emit 'start'
      assert.ok nyanReporter.cursorHide.calledOnce
      assert.ok nyanReporter.draw.calledOnce
      done()

  describe 'when ending', () ->

    beforeEach () ->
      sinon.spy loggerStub, 'complete'
      sinon.stub(nyanReporter, 'draw', ()->)

    afterEach () ->
      loggerStub.complete.restore()
      nyanReporter.draw.restore()

    it 'should log that testing is complete', (done) ->
      emitter.emit 'end'
      assert.ok loggerStub.complete.calledTwice
      done()

    describe 'when there are failures', () ->

      before () ->
        test =
          status: 'fail'
          title: 'failing test'
        nyanReporter.errors = [test]
        emitter.emit 'test start', test

      beforeEach () ->
        sinon.spy loggerStub, 'fail'

      afterEach () ->
        loggerStub.fail.restore()

      it 'should log the failures at the end of testing', (done) ->
        emitter.emit 'end'
        assert.ok loggerStub.fail.calledTwice
        done()

  describe 'when test finished', () ->

    describe 'when test passes', () ->

      before () ->
        test =
          status: 'pass'
          title: 'Passing Test'
        sinon.stub(nyanReporter, 'draw', ()->)
        emitter.emit 'test pass', test

      after () ->
        nyanReporter.draw.restore()

      it 'should draw the cat', (done) ->
        assert.ok nyanReporter.draw.calledOnce
        done()

    describe 'when test is skipped', () ->
      before () ->
        test =
          status: 'skipped'
          title: 'Skipped Test'
        sinon.stub(nyanReporter, 'draw', ()->)
        emitter.emit 'test skip', test

      after () ->
        nyanReporter.draw.restore()

      it 'should draw the cat', (done) ->
        assert.ok nyanReporter.draw.calledOnce
        done()

    describe 'when test fails', () ->

      before () ->
        test =
          status: 'failed'
          title: 'Failed Test'
        sinon.stub(nyanReporter, 'draw', ()->)
        emitter.emit 'test fail', test

      after () ->
        nyanReporter.draw.restore()

      it 'should draw the cat', (done) ->
        assert.ok nyanReporter.draw.calledOnce
        done()

    describe 'when test errors', () ->

      before () ->
        test =
          status: 'error'
          title: 'Errored Test'
        sinon.stub(nyanReporter, 'draw', ()->)
        emitter.emit 'test error', test, new Error('Error')

      after () ->

        nyanReporter.draw.restore()

      it 'should draw the cat', (done) ->
        assert.ok nyanReporter.draw.calledOnce
        done()

