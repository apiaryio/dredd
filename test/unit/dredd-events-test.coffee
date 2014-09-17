require 'coffee-errors'
{assert} = require 'chai'
sinon = require 'sinon'


dreddEvents = require '../../src/dredd-events'

describe 'DreddEvents', () ->

  describe 'before', () ->
    callback = sinon.spy()

    it 'should do nothing if not registered', (done) ->
      dreddEvents.runBefore () ->
        assert.ok callback.notCalled
        done()

    it 'should callback if registered', (done) ->
      dreddEvents.beforeAll (d) ->
        assert.ok(typeof d is 'function')
        d()
      dreddEvents.runBefore (d) ->
        done()

  describe 'after', () ->
    callback = sinon.spy()

    it 'should do nothing if not registered', (done) ->
      dreddEvents.runAfter () ->
        assert.ok callback.notCalled
        done()

    it 'should callback if registered', (done) ->
      dreddEvents.afterAll (d) ->
        assert.ok(typeof d is 'function')
        d()
      dreddEvents.runAfter (d) ->
        done()
