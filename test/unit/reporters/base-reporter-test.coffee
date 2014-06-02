{assert} = require 'chai'
sinon = require 'sinon'
proxyquire = require('proxyquire').noCallThru()

{EventEmitter} = require 'events'
loggerStub = require '../../../src/logger'
BaseReporter = proxyquire '../../../src/reporters/base-reporter', {
  './../logger' : loggerStub
}

describe 'BaseReporter', () ->

  stats = {}
  tests = []
  test = {}
  emitter = {}
  baseReporter = {}

  beforeEach () ->
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
    emitter = new EventEmitter()
    baseReporter = new BaseReporter(emitter, stats, tests)

  describe 'when starting', () ->

    before () ->
      stats =
        start: null

    it 'should set the start date', (done) ->
      emitter.emit 'start', '', () ->
        assert.ok stats.start
        done()

  describe 'when ending', () ->

    before () ->
      stats =
        end: null

    it 'should set the end date', (done) ->
      emitter.emit 'end', () ->
        assert.ok stats.end
        done()

  describe 'when test starts', () ->

    before () ->
      test =
        status: 'pass'
        title: 'Passing Test'

    it 'should add the test', () ->
      emitter.emit 'test start', test
      assert.ok tests.length is 1

  describe 'when test passes', () ->

    beforeEach () ->
      test =
        status: 'pass'
        title: 'Passing Test'
      emitter.emit 'test start', test
      emitter.emit 'test pass', test

    it 'should increment the counter', () ->
      assert.equal stats.passes, 1

    it 'should set the end time', () ->
      assert.ok tests[0].end

  describe 'when test is skipped', () ->
    beforeEach () ->
      test =
        status: 'skipped'
        title: 'Skipped Test'
      emitter.emit 'test start', test
      emitter.emit 'test skip', test

    it 'should increment the counter', () ->
      assert.ok stats.skipped is 1

  describe 'when test fails', () ->

    beforeEach () ->
      test =
        status: 'failed'
        title: 'Failed Test'
      emitter.emit 'test start', test
      emitter.emit 'test fail', test

    it 'should increment the counter', () ->
      assert.ok stats.failures is 1

    it 'should set the end time', () ->
      assert.ok tests[0].end

  describe 'when test errors', () ->

    beforeEach () ->
      test =
        status: 'error'
        title: 'Errored Test'
      emitter.emit 'test start', test
      emitter.emit 'test error', new Error('Error'), test

    it 'should increment the counter', () ->
      assert.ok stats.errors is 1

    it 'should set the end time', () ->
      assert.ok tests[0].end
