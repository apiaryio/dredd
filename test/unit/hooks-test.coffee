require 'coffee-errors'
sinon = require 'sinon'
{assert} = require 'chai'


Hooks = require '../../src/hooks'

describe 'Hooks', () ->

  describe 'when adding before hook', () ->
    hooks = null

    before () ->
      hooks = new Hooks()
      hooks.before 'beforeHook', () ->
        ""

    it 'should add to hook collection', () ->
      assert.property hooks.beforeHooks, 'beforeHook'

  describe 'when adding after hook', () ->
    hooks = null

    before () ->
      hooks = new Hooks()
      hooks.after 'afterHook', () ->
        ""

    it 'should add to hook collection', () ->
      assert.property hooks.afterHooks, 'afterHook'

  describe 'when adding beforeAll hooks', () ->

    it 'should invoke registered callbacks', (testDone) ->
      callback = sinon.stub()
      callback.callsArg(0)

      hooks = new Hooks()
      hooks.beforeAll callback
      hooks.beforeAll (done) ->
        assert.ok typeof done is 'function'
        assert.ok callback.called
        done()
      hooks.runBeforeAll (done) ->
        testDone()

  describe 'when adding afterAll hooks', () ->

    it 'should callback if registered', (testDone) ->
      callback = sinon.stub()
      callback.callsArg(0)

      hooks = new Hooks()
      hooks.afterAll callback
      hooks.afterAll (done) ->
        assert.ok(typeof done is 'function')
        assert.ok callback.called
        done()
      hooks.runAfterAll (done) ->
        testDone()
