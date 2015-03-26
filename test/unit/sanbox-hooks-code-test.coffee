{assert} = require 'chai'

sandboxHooksCode = require '../../src/sandbox-hooks-code'

describe 'sandboxHooksCode(hooksCode, callback)', () ->

  it 'should be a defined function', () ->
    assert.isFunction sandboxHooksCode

  it 'should run the code' #, (done) ->
    # code = """

    # """
    # sandboxHooksCode code, (err,result) ->
    #   done()


  describe 'when hook loading explodes', () ->
    it 'should return an error in callback'

  describe 'context of code adding hooks', () ->
    it 'should not have access to addHooks context'
    it 'should not have access to require'
    it 'should have defined before'
    it 'should have defined after'
    it 'should have defined beforeAll'
    it 'should have defined afterAll'
    it 'should have defined beforeEach'
    it 'should have defined afterEach'

  it 'should pass result object to the second callback argument'

  describe 'should result object', () ->
    it 'should have same stricture as hooks object'
    it 'should contain function strings in their places'