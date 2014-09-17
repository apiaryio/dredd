require 'coffee-errors'
{assert} = require 'chai'
sinon = require 'sinon'


dreddEvents = require '../../src/dredd-events'

describe 'DreddEvents', () ->

  describe 'before', () ->
    callback = sinon.spy()

    it 'should do nothing if not registered', (done) ->
      dreddEvents.runBeforeAll () ->
        assert.ok callback.notCalled
        done()

    it 'should callback if registered', (testDone) ->
      dreddEvents.beforeAll (initDone) ->
        assert.ok(typeof initDone is 'function')
        initDone()
      dreddEvents.runBeforeAll (runDone) ->
        testDone()

  describe 'after', () ->
    callback = sinon.spy()

    it 'should do nothing if not registered', (done) ->
      dreddEvents.runAfterAll () ->
        assert.ok callback.notCalled
        done()

    it 'should callback if registered', (testDone) ->
      dreddEvents.afterAll (initDone) ->
        assert.ok(typeof initDone is 'function')
        initDone()
      dreddEvents.runAfterAll (runDone) ->
        testDone()
