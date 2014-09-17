require 'coffee-errors'
{assert} = require 'chai'
sinon = require 'sinon'


dreddEvents = require '../../src/dredd-events'

describe 'DreddEvents', () ->

  describe 'before', () ->
    callback = sinon.spy()

    afterEach () ->
      dreddEvents.reset()

    it 'should do nothing if not registered', (done) ->
      dreddEvents.runBeforeAll () ->
        assert.ok callback.notCalled
        done()

    it 'should callback if registered', (testDone) ->
      firstCallback = sinon.stub()
      firstCallback.callsArg(0)

      dreddEvents.beforeAll firstCallback
      dreddEvents.beforeAll (done) ->
        assert.ok typeof done is 'function'
        assert.ok firstCallback.called
        done()
      dreddEvents.runBeforeAll (done) ->
        testDone()

  describe 'after', () ->
    callback = sinon.spy()

    it 'should do nothing if not registered', (done) ->
      dreddEvents.runAfterAll () ->
        assert.ok callback.notCalled
        done()

    it 'should callback if registered', (testDone) ->
      firstCallback = sinon.stub()
      firstCallback.callsArg(0)

      dreddEvents.afterAll firstCallback
      dreddEvents.afterAll (done) ->
        assert.ok(typeof done is 'function')
        assert.ok firstCallback.called
        done()
      dreddEvents.runAfterAll (done) ->
        testDone()
