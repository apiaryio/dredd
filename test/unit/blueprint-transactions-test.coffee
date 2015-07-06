{assert} = require 'chai'
blueprintTransactions = require '../../src/blueprint-transactions'
ast = require '../fixtures/blueprint-ast'

describe 'blueprintTransactions', () ->

  it 'exports an object', () ->
    assert.isObject blueprintTransactions

  describe 'compile(ast, filename, options)', () ->
    it 'is defined function', () ->
      assert.isFunction blueprintTransactions.compile

    it 'returns an object', () ->
      assert.isObject blueprintTransactions.compile(ast)

    describe 'returned object', () ->
      returnedObject = null
      beforeEach () ->
        returnedObject = blueprintTransactions.compile(ast, './apiary.apibs')

      keys = [
        'transactions'
        'errors'
        'warnings'
      ]

      for key in keys then do (key) ->
        it "it has key #{key}", () ->
          assert.property returnedObject, key

      describe 'every item in `transactions` array', () ->
        it 'should have the "name" property set', () ->
          for transaction, index in returnedObject.transactions
            assert.property transaction, 'name', "Missing 'name' property on transaction #{index}"
