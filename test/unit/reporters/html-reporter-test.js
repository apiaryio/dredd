{assert} = require 'chai'
sinon = require 'sinon'
proxyquire = require('proxyquire').noCallThru()

{EventEmitter} = require 'events'
loggerStub = require '../../../src/logger'
fsStub = require 'fs'
fsExtraStub = {mkdirp: (path, cb) -> cb()}

HtmlReporter = proxyquire '../../../src/reporters/html-reporter', {
  './../logger' : loggerStub
  'fs' : fsStub
  'fs-extra' : fsExtraStub
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
        sinon.stub(fsStub, 'existsSync').callsFake (path) ->
          return true
        sinon.stub loggerStub, 'info'

      after () ->
        fsStub.existsSync.restore()
        loggerStub.info.restore()

      it 'should inform about the existing file', () ->
        assert.isOk loggerStub.info.called

    describe 'when file does not exist', () ->

      before () ->
        sinon.stub(fsStub, 'existsSync').callsFake (path) ->
          return false
        sinon.stub fsStub, 'unlinkSync'

      after () ->
        fsStub.existsSync.restore()
        fsStub.unlinkSync.restore()

      it 'should not attempt to delete a file', () ->
        assert.isOk fsStub.unlinkSync.notCalled

    it 'should write the prelude to the buffer', (done) ->
      emitter.emit 'start', '' , () ->
        assert.isOk ~htmlReporter.buf.indexOf 'Dredd'
        done()

  describe 'when ending', () ->

    before () ->
      stats.tests = 1

    describe 'when can create output directory', () ->

      beforeEach () ->
        sinon.stub(fsStub, 'writeFile').callsFake (path, data, callback) ->
          callback()
        sinon.spy(fsExtraStub, 'mkdirp')

      afterEach () ->
        fsStub.writeFile.restore()
        fsExtraStub.mkdirp.restore()

      it 'should write the file', (done) ->
        emitter.emit 'end', () ->
          assert.isOk fsExtraStub.mkdirp.called
          assert.isOk fsStub.writeFile.called
          done()

    describe 'when cannot create output directory', () ->

      beforeEach () ->
        sinon.stub loggerStub, 'error'
        sinon.stub(fsStub, 'writeFile').callsFake (path, data, callback) ->
          callback()
        sinon.stub(fsExtraStub, 'mkdirp').callsFake((path, cb) -> cb('error'))

      after () ->
        loggerStub.error.restore()
        fsStub.writeFile.restore()
        fsExtraStub.mkdirp.restore()

      it 'should write to log', (done) ->
        emitter.emit 'end', () ->
          assert.isOk fsExtraStub.mkdirp.called
          assert.isOk fsStub.writeFile.notCalled
          assert.isOk loggerStub.error.called
          done()

  describe 'when test passes', () ->

    before () ->
      test =
        status: 'pass'
        title: 'Passing Test'

    it 'should call the pass event', () ->
      emitter.emit 'test start', test
      emitter.emit 'test pass', test
      assert.isOk ~htmlReporter.buf.indexOf 'Pass'

    describe 'when details=true', () ->

      it 'should write details for passing tests', () ->
        htmlReporter.details = true
        emitter.emit 'test pass', test
        assert.isOk ~htmlReporter.buf.indexOf 'Request'

  describe 'when test is skipped', () ->
    before () ->
      test =
        status: 'skipped'
        title: 'Skipped Test'

    it 'should call the skip event', () ->
      emitter.emit 'test start', test
      emitter.emit 'test skip', test
      assert.isOk ~htmlReporter.buf.indexOf 'Skip'

  describe 'when test fails', () ->

    before () ->
      test =
        status: 'failed'
        title: 'Failed Test'

    it 'should call the fail event', () ->
      emitter.emit 'test start', test
      emitter.emit 'test fail', test
      assert.isOk ~htmlReporter.buf.indexOf 'Fail'

  describe 'when test errors', () ->

    before () ->
      test =
        status: 'error'
        title: 'Errored Test'

    it 'should call the error event', () ->
      emitter.emit 'test start', test
      emitter.emit 'test error', new Error('Error'), test
      assert.isOk ~htmlReporter.buf.indexOf 'Error'
