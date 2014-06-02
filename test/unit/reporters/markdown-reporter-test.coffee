{assert} = require 'chai'
sinon = require 'sinon'
proxyquire = require('proxyquire').noCallThru()


{EventEmitter} = require 'events'
fsStub = require 'fs'
loggerStub = require '../../../src/logger'
MarkdownReporter = proxyquire '../../../src/reporters/markdown-reporter', {
  './../logger' : loggerStub
  'fs': fsStub
}

describe 'MarkdownReporter', () ->

  test = {}
  emitter = {}
  stats = {}
  tests = []
  mdReporter = {}

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
    mdReporter = new MarkdownReporter(emitter, stats, tests, "test.md")


  describe 'when creating', () ->

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

      it 'should create the file', (done) ->
        assert.ok fsStub.unlinkSync.notCalled
        done()

  describe 'when starting', () ->

    it 'should write the title to the buffer', (done) ->
      emitter.emit 'start', '', () ->
        assert.ok ~mdReporter.buf.indexOf 'Dredd'
        done()

  describe 'when ending', () ->

    beforeEach () ->
      sinon.stub fsStub, 'writeFile'

    afterEach () ->
      fsStub.writeFile.restore()

    it 'should write buffer to file', (done) ->
      emitter.emit 'end'
      assert.ok fsStub.writeFile.called
      done()

  describe 'when test passes', () ->

    beforeEach () ->
      test =
        status: 'pass'
        title: 'Passing Test'
      emitter.emit 'test start', test
      emitter.emit 'test pass', test

    it 'should write pass to the buffer', (done) ->
      assert.ok ~mdReporter.buf.indexOf 'Pass'
      done()

    describe 'when details=true', () ->

      it 'should write details for passing tests', (done) ->
        mdReporter.details = true
        emitter.emit 'test pass', test
        assert.ok ~mdReporter.buf.indexOf 'Request'
        done()

  describe 'when test is skipped', () ->
    beforeEach () ->
      test =
        status: 'skipped'
        title: 'Skipped Test'
      emitter.emit 'test start', test
      emitter.emit 'test skip', test

    it 'should write skip to the buffer', (done) ->
      assert.ok ~mdReporter.buf.indexOf 'Skip'
      done()

  describe 'when test fails', () ->

    beforeEach () ->
      test =
        status: 'failed'
        title: 'Failed Test'
      emitter.emit 'test start', test
      emitter.emit 'test fail', test

    it 'should write fail to the buffer', (done) ->
      assert.ok ~mdReporter.buf.indexOf 'Fail'
      done()

  describe 'when test errors', () ->

    beforeEach () ->
      test =
        status: 'error'
        title: 'Errored Test'
      emitter.emit 'test start', test
      emitter.emit 'test error', new Error('Error'), test

    it 'should write error to the buffer', (done) ->
      assert.ok ~mdReporter.buf.indexOf 'Error'
      done()
