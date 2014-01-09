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
mdReporter = new MarkdownReporter(emitter, stats, tests)

describe 'MarkdownReporter', () ->

  describe 'when starting', () ->

    it 'should write the title to the buffer', (done) ->
      emitter.emit 'start'
      assert.ok ~mdReporter.buf.indexOf 'Dredd'
      done()

  describe 'when ending', () ->

    beforeEach () ->
       sinon.spy fsStub, 'writeFile'

    afterEach () ->
      fsStub.writeFile.restore()

    it 'should write buffer to file', (done) ->
      emitter.emit 'end'
      assert.ok fsStub.writeFile.calledOnce
      done()

  describe 'when test passes', () ->

    before () ->
      test =
        status: 'pass'
        title: 'Passing Test'
      emitter.emit 'test start', test
      emitter.emit 'test pass', test

    it 'should write pass to the buffer', (done) ->
      assert.ok ~mdReporter.buf.indexOf 'Pass'
      done()

  describe 'when test is skipped', () ->
    before () ->
      test =
        status: 'skipped'
        title: 'Skipped Test'
      emitter.emit 'test start', test
      emitter.emit 'test skip', test

    it 'should write skip to the buffer', (done) ->
      assert.ok ~mdReporter.buf.indexOf 'Skip'
      done()

  describe 'when test fails', () ->

    before () ->
      test =
        status: 'failed'
        title: 'Failed Test'
      emitter.emit 'test start', test
      emitter.emit 'test fail', test

    it 'should write fail to the buffer', (done) ->
      assert.ok ~mdReporter.buf.indexOf 'Fail'
      done()

  describe 'when test errors', () ->

    before () ->
      test =
        status: 'error'
        title: 'Errored Test'
      emitter.emit 'test start', test
      emitter.emit 'test error', test, new Error('Error')

    it 'should write error to the buffer', (done) ->
      assert.ok ~mdReporter.buf.indexOf 'Error'
      done()


