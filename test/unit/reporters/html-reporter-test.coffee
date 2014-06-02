{assert} = require 'chai'
sinon = require 'sinon'
proxyquire = require('proxyquire').noCallThru()

{EventEmitter} = require 'events'
loggerStub = require '../../../src/logger'
fsStub = require 'fs'

HtmlReporter = proxyquire '../../../src/reporters/html-reporter', {
  './../logger' : loggerStub
  'fs' : fsStub
}

describe 'HtmlReporter', () ->

  test = {}
  emitter = {}
  stats = {}
  tests = []
  htmlReporter = {}

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
    htmlReporter = new HtmlReporter(emitter, stats, tests, "test.html")

  describe 'when starting', () ->

    describe 'when file exists', () ->
      before () ->
        sinon.stub fsStub, 'existsSync', (path) ->
          return true
        sinon.stub loggerStub, 'info'

      after () ->
        fsStub.existsSync.restore()
        loggerStub.info.restore()

      it 'should inform about the existing file', () ->
        assert.ok loggerStub.info.called

    describe 'when file does not exist', () ->

      before () ->
        sinon.stub fsStub, 'existsSync', (path) ->
          return false
        sinon.stub fsStub, 'unlinkSync'

      after () ->
        fsStub.existsSync.restore()
        fsStub.unlinkSync.restore()

      it 'should not attempt to delete a file', () ->
        assert.ok fsStub.unlinkSync.notCalled

    it 'should write the prelude to the buffer', (done) ->
      emitter.emit 'start', '' , () ->
        assert.ok ~htmlReporter.buf.indexOf 'Dredd'
        done()

  describe 'when ending', () ->

    before () ->
      stats.tests = 1

    beforeEach () ->
      sinon.stub fsStub, 'writeFile', (path, data, callback) ->
        callback()

    afterEach () ->
      fsStub.writeFile.restore()

    it 'should write the file', (done) ->
      emitter.emit 'end', () ->
        assert.ok fsStub.writeFile.called
        done()

  describe 'when test passes', () ->

    before () ->
      test =
        status: 'pass'
        title: 'Passing Test'

    it 'should call the pass event', () ->
      emitter.emit 'test start', test
      emitter.emit 'test pass', test
      assert.ok ~htmlReporter.buf.indexOf 'Pass'

    describe 'when details=true', () ->

      it 'should write details for passing tests', () ->
        htmlReporter.details = true
        emitter.emit 'test pass', test
        assert.ok ~htmlReporter.buf.indexOf 'Request'

  describe 'when test is skipped', () ->
    before () ->
      test =
        status: 'skipped'
        title: 'Skipped Test'

    it 'should call the skip event', () ->
      emitter.emit 'test start', test
      emitter.emit 'test skip', test
      assert.ok ~htmlReporter.buf.indexOf 'Skip'

  describe 'when test fails', () ->

    before () ->
      test =
        status: 'failed'
        title: 'Failed Test'

    it 'should call the fail event', () ->
      emitter.emit 'test start', test
      emitter.emit 'test fail', test
      assert.ok ~htmlReporter.buf.indexOf 'Fail'

  describe 'when test errors', () ->

    before () ->
      test =
        status: 'error'
        title: 'Errored Test'

    it 'should call the error event', () ->
      emitter.emit 'test start', test
      emitter.emit 'test error', new Error('Error'), test
      assert.ok ~htmlReporter.buf.indexOf 'Error'
