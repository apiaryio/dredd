require 'coffee-errors'
clone = require 'clone'
sinon = require 'sinon'
{assert} = require 'chai'


Hooks = require '../../src/hooks'

describe 'Hooks', () ->

  describe 'constructor', ->

    it 'should not add @logs or @logger when constructor options are empty', () ->
      hooks = new Hooks()
      assert.isUndefined hooks.logs
      assert.isUndefined hooks.logger

    it 'should add @logs and @logger from passed options', () ->
      options =
        logs: [{content: 'message1'}, {content: 'message2'}]
        logger:
          hook: ->
          error: ->

      hooks = new Hooks(options)
      assert.strictEqual hooks.logs, options.logs
      assert.strictEqual hooks.logger, options.logger

  describe '#log', ->
    options = null

    beforeEach ->
      options =
        logs: [{content: 'message1'}, {content: 'message2'}]
        logger:
          hook: ->
          error: ->
      sinon.spy options.logger, 'hook'
      sinon.spy options.logger, 'error'

    afterEach ->
      options.logger.hook.restore()
      options.logger.error.restore()

    it 'should call @logger.hook when hooks.log is called with 1 argument', ->
      hooks = new Hooks options
      hooks.log 'messageX'
      assert.isTrue options.logger.hook.called
      assert.isFalse options.logger.error.called
      assert.deepProperty hooks.logs[2], 'timestamp'
      assert.deepPropertyVal hooks.logs[0], 'content', 'message1'
      assert.deepPropertyVal hooks.logs[1], 'content', 'message2'
      assert.deepPropertyVal hooks.logs[2], 'content', 'messageX'

  describe '#before', () ->
    hooks = null

    before () ->
      hooks = new Hooks()
      hooks.before 'beforeHook', () ->
        ""

    it 'should add to hook collection', () ->
      assert.property hooks.beforeHooks, 'beforeHook'

  describe '#beforeValidation', () ->
    hooks = null

    before () ->
      hooks = new Hooks()
      hooks.beforeValidation 'beforeValidationHook', () ->
        ""

    it 'should add to hook collection', () ->
      assert.property hooks.beforeValidationHooks, 'beforeValidationHook'

  describe '#after', () ->
    hooks = null

    before () ->
      hooks = new Hooks()
      hooks.after 'afterHook', () ->
        ""

    it 'should add to hook collection', () ->
      assert.property hooks.afterHooks, 'afterHook'

  describe '#beforeAll', () ->
    hooks = null

    before () ->
      hooks = new Hooks()
      hooks.beforeAll () ->
        ""

    it 'should add to hook collection', () ->
      assert.lengthOf hooks.beforeAllHooks, 1

  describe '#afterAll', () ->
    hooks = null

    before () ->
      hooks = new Hooks()
      hooks.afterAll () ->
        ""

    it 'should add to hook collection', () ->
      assert.lengthOf hooks.afterAllHooks, 1

  describe '#beforeEach', () ->
    hooks = null

    before () ->
      hooks = new Hooks()
      hooks.beforeEach () ->
        ""

    it 'should add to hook collection', () ->
      assert.lengthOf hooks.beforeEachHooks, 1

  describe '#beforeEachValidation', () ->
    hooks = null

    before () ->
      hooks = new Hooks()
      hooks.beforeEachValidation () ->
        ""

    it 'should add to hook collection', () ->
      assert.lengthOf hooks.beforeEachValidationHooks, 1


  describe '#afterEach', () ->
    hooks = null

    before () ->
      hooks = new Hooks()
      hooks.afterEach () ->
        ""

    it 'should add to hook collection', () ->
      assert.lengthOf hooks.afterEachHooks, 1

  describe '#dumpHooksFunctionsToStrings', () ->
    hooks = null

    beforeEach () ->
      hooks = new Hooks()
      hook = (data, callback) ->
        return true

      hooks.beforeAll hook
      hooks.beforeEach hook
      hooks.before 'Transaction Name', hook
      hooks.after 'Transaction Name', hook
      hooks.afterEach hook
      hooks.afterAll hook


    it 'should return an object', () ->
      assert.isObject hooks.dumpHooksFunctionsToStrings()

    describe 'returned object', () ->
      properties = [
        'beforeAllHooks'
        'beforeEachHooks'
        'afterEachHooks'
        'afterAllHooks'
        'beforeEachValidationHooks'
      ]

      for property in properties then do (property) ->
        it "should have property '#{property}'", () ->
          object = hooks.dumpHooksFunctionsToStrings()
          assert.property object, property

        it 'should be an array', () ->
          object = hooks.dumpHooksFunctionsToStrings()
          assert.isArray object[property]

        describe "all array members under property '#{property}'", () ->
          it 'should be a string', () ->
            object = hooks.dumpHooksFunctionsToStrings()
            for key, value of object[property] then do (key, value) ->
              assert.isString value, "on #{property}['#{key}']"

      properties = [
        'beforeHooks'
        'afterHooks'
        'beforeValidationHooks'
      ]

      for property in properties then do (property) ->
        it "should have property '#{property}'", () ->
          object = hooks.dumpHooksFunctionsToStrings()
          assert.property object, property

        it 'should be an object', () ->
          object = hooks.dumpHooksFunctionsToStrings()
          assert.isObject object[property]

        describe 'each object value', () ->
          it 'should be an array', () ->
            object = hooks.dumpHooksFunctionsToStrings()
            for key, value of object[property] then do (key, value) ->
              assert.isArray object[property][key], "at hooks.dumpHooksFunctionsToStrings()[#{property}][#{key}]"

        describe 'each member in that array', () ->
          it 'should be a string', () ->
            object = hooks.dumpHooksFunctionsToStrings()
            for transactionName, funcArray of object[property] then do (transactionName, funcArray) ->
              for index, func of funcArray
                assert.isString object[property][transactionName][index], "at hooks.dumpHooksFunctionsToStrings()[#{property}][#{transactionName}][#{index}]"

