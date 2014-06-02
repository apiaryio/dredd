{assert} = require 'chai'
sinon = require 'sinon'
proxyquire = require('proxyquire').noCallThru()

{EventEmitter} = require 'events'
loggerStub = require '../../../src/logger'
NyanCatReporter = proxyquire '../../../src/reporters/nyan-reporter', {
  './../logger' : loggerStub
}

describe 'NyanCatReporter', () ->

  emitter = {}
  stats = {}
  tests = []
  nyanReporter = {}

  before () ->
    loggerStub.transports.console.silent = true

  after () ->
    loggerStub.transports.console.silent = false

  beforeEach () ->
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

  describe 'when starting', () ->

    beforeEach () ->
      sinon.spy nyanReporter, 'cursorHide'
      sinon.spy nyanReporter, 'draw'
      sinon.stub nyanReporter, 'write'

    afterEach () ->
      nyanReporter.cursorHide.restore()
      nyanReporter.draw.restore()
      nyanReporter.write.restore()

    it 'should hide the cursor and draw the cat', (done) ->
      emitter.emit 'start', '', () ->
        assert.ok nyanReporter.cursorHide.calledOnce
        assert.ok nyanReporter.draw.calledOnce
        done()

  describe 'when ending', () ->

    beforeEach () ->
      sinon.spy loggerStub, 'complete'
      sinon.spy nyanReporter, 'draw'
      sinon.stub nyanReporter, 'write'

    afterEach () ->
      loggerStub.complete.restore()
      nyanReporter.draw.restore()
      nyanReporter.write.restore()

    it 'should log that testing is complete', (done) ->
      emitter.emit 'end', () ->
        assert.ok loggerStub.complete.calledTwice
        done()

    describe 'when there are failures', () ->

      beforeEach () ->
        test =
          status: 'fail'
          title: 'failing test'
        nyanReporter.errors = [test]
        emitter.emit 'test start', test
        sinon.spy loggerStub, 'fail'

      afterEach () ->
        loggerStub.fail.restore()

      it 'should log the failures at the end of testing', (done) ->
        emitter.emit 'end', ()->
          assert.ok loggerStub.fail.calledTwice
          done()

  describe 'when test finished', () ->

    describe 'when test passes', () ->

      beforeEach () ->
        test =
          status: 'pass'
          title: 'Passing Test'
        sinon.stub nyanReporter, 'write'
        sinon.spy nyanReporter, 'draw'
        emitter.emit 'test pass', test

      afterEach () ->
        nyanReporter.draw.restore()
        nyanReporter.write.restore()

      it 'should draw the cat', () ->
        assert.ok nyanReporter.draw.calledOnce

    describe 'when test is skipped', () ->
      beforeEach () ->
        test =
          status: 'skipped'
          title: 'Skipped Test'
        sinon.spy nyanReporter, 'draw'
        sinon.stub nyanReporter, 'write'
        emitter.emit 'test skip', test

      afterEach () ->
        nyanReporter.draw.restore()
        nyanReporter.write.restore()

      it 'should draw the cat', () ->
        assert.ok nyanReporter.draw.calledOnce

    describe 'when test fails', () ->

      beforeEach () ->
        test =
          status: 'failed'
          title: 'Failed Test'
        sinon.spy nyanReporter, 'draw'
        sinon.stub nyanReporter, 'write'
        emitter.emit 'test fail', test

      afterEach () ->
        nyanReporter.draw.restore()
        nyanReporter.write.restore()

      it 'should draw the cat', () ->
        assert.ok nyanReporter.draw.calledOnce

    describe 'when test errors', () ->

      beforeEach () ->
        test =
          status: 'error'
          title: 'Errored Test'
        sinon.spy nyanReporter, 'draw'
        sinon.stub nyanReporter, 'write'
        emitter.emit 'test error', new Error('Error'), test

      afterEach () ->
        nyanReporter.write.restore()
        nyanReporter.draw.restore()

      it 'should draw the cat', () ->
        assert.ok nyanReporter.draw.calledOnce

