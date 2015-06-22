{assert} = require 'chai'

sandboxHooksCode = require '../../src/sandbox-hooks-code'

describe 'sandboxHooksCode(hooksCode, callback)', () ->

  it 'should be a defined function', () ->
    assert.isFunction sandboxHooksCode

  describe 'when hookscode explodes', () ->
    it 'should return an error in callback', (done) ->
      hooksCode = """
      throw(new Error("Exploded during sandboxed processing of hook file"));
      """
      sandboxHooksCode hooksCode, (err, result) ->
        assert.include err, 'sandbox'
        done()

  describe 'context of code adding hooks', () ->
    it 'should not have access to this context', (done) ->
      contextVar = 'a'
      hooksCode = """
      contextVar = "b";
      """
      sandboxHooksCode hooksCode, (err, result) ->
        assert.equal contextVar, 'a'
        done()

    it 'should not have access to require', (done) ->
      contextVar = ''
      hooksCode = """
      require('fs');
      """
      sandboxHooksCode hooksCode, (err, result) ->
        assert.include err, 'require'
        done()

    functions = [
      'before'
      'after'
      'beforeAll'
      'afterAll'
      'beforeEach'
      'afterEach'
      'beforeEachValidation'
      'beforeValidation'
    ]

    for name in functions then do (name) ->
      it "should have defined function '#{name}'", (done) ->
        hooksCode = """
        if(typeof(#{name}) !== 'function'){
          throw(new Error('#{name} is not a function'))
        }
        """
        sandboxHooksCode hooksCode, (err, result) ->
          assert.isUndefined err
          done()

    it 'should pass result object to the second callback argument', (done) ->
      hooksCode = ""
      sandboxHooksCode hooksCode, (err, result) ->
        return done(err) if err
        assert.isObject result
        done()

  describe 'result object', () ->
    properties = [
      'beforeAllHooks'
      'beforeEachHooks'
      'beforeHooks'
      'afterHooks'
      'afterEachHooks'
      'afterAllHooks'
      'beforeValidationHooks'
      'beforeEachValidationHooks'
    ]

    for property in properties then do (property) ->
      it "should have property #{property}", (done) ->
        hooksCode = """
        var dummyFunc = function(data){
          return true;
        }

        beforeAll(dummyFunc);
        beforeEach(dummyFunc);
        before('Transaction Name', dummyFunc);
        after('Transaction Name', dummyFunc);
        beforeEach(dummyFunc);
        afterEach(dummyFunc);
        beforeEachValidation(dummyFunc);
        beforeValidation('Transaction Name', dummyFunc);
        """

        sandboxHooksCode hooksCode, (err, result) ->
          return done(err) if err
          assert.property result, property
          done()


