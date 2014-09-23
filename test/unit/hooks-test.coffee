require 'coffee-errors'
sinon = require 'sinon'
{assert} = require 'chai'


hooks = require '../../src/hooks'

describe 'Hooks', () ->

  describe 'when adding before hook', () ->

    before () ->
      hooks.before 'beforeHook', () ->
        ""
    after () ->
      hooks.beforeHooks = {}

    it 'should add to hook collection', () ->
      assert.property hooks.beforeHooks, 'beforeHook'

  describe 'when adding after hook', () ->

    before () ->
      hooks.after 'afterHook', () ->
        ""
    after () ->
      hooks.afterHooks = {}

    it 'should add to hook collection', () ->
      assert.property hooks.afterHooks, 'afterHook'

  describe 'when adding beforeAll hooks', () ->

    afterEach () ->
      hooks.beforeAllHooks = []

    it 'should invoke registered callbacks', (testDone) ->
      callback = sinon.stub()
      callback.callsArg(0)

      hooks.beforeAll callback
      hooks.beforeAll (done) ->
        assert.ok typeof done is 'function'
        assert.ok callback.called
        done()
      hooks.runBeforeAll (done) ->
        testDone()

  describe 'when adding afterAll hooks', () ->

    afterEach () ->
      hooks.afterAllHooks = []

    it 'should callback if registered', (testDone) ->
      callback = sinon.stub()
      callback.callsArg(0)

      hooks.afterAll callback
      hooks.afterAll (done) ->
        assert.ok(typeof done is 'function')
        assert.ok callback.called
        done()
      hooks.runAfterAll (done) ->
        testDone()
