{assert} = require 'chai'
sinon = require 'sinon'
proxyquire = require('proxyquire').noCallThru()

{EventEmitter} = require 'events'
loggerStub = require '../../../src/logger'
BaseReporter = proxyquire '../../../src/reporters/base-reporter', {
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
baseReporter = new BaseReporter(emitter, stats, tests)

describe 'BaseReporter', () ->

  describe 'when starting', () ->
    it 'should set the start date', (done) ->
      emitter.emit 'start'
      assert.ok stats.start
      done()

  describe 'when ending', () ->
    it 'should set the end date', (done) ->
      emitter.emit 'end', () ->
        assert.ok stats.end
        done()

  describe 'when test starts', () ->
    before () ->
      test =
        status: 'pass'
        title: 'Passing Test'
      emitter.emit 'test start', test

    it 'should add the test', (done) ->
      assert.ok tests.length is 1
      done()

  describe 'when test passes', () ->

    before () ->
      test =
        status: 'pass'
        title: 'Passing Test'
      emitter.emit 'test start', test
      emitter.emit 'test pass', test

    it 'should increment the counter', (done) ->
      assert.ok stats.passes is 1
      done()

    it 'should set the end time', (done) ->
      assert.ok tests[1].end
      done()

  describe 'when test is skipped', () ->
    before () ->
      test =
        status: 'skipped'
        title: 'Skipped Test'
      emitter.emit 'test start', test
      emitter.emit 'test skip', test

    it 'should increment the counter', (done) ->
      assert.ok stats.skipped is 1
      done()

  describe 'when test fails', () ->

    before () ->
      test =
        status: 'failed'
        title: 'Failed Test'
      emitter.emit 'test start', test
      emitter.emit 'test fail', test

    it 'should increment the counter', (done) ->
      assert.ok stats.failures is 1
      done()

    it 'should set the end time', (done) ->
      assert.ok tests[3].end
      done()

  describe 'when test errors', () ->

    before () ->
      test =
        status: 'error'
        title: 'Errored Test'
      emitter.emit 'test start', test
      emitter.emit 'test error', new Error('Error'), test

    it 'should increment the counter', (done) ->
      assert.ok stats.errors is 1
      done()

    it 'should set the end time', (done) ->
      assert.ok tests[4].end
      done()
