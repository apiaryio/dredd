{assert} = require 'chai'
blueprintTransactions = require '../../../src/blueprint-transactions'
ast = require '../../fixtures/blueprint-ast'

describe 'blueprintTransactions [AST]', ->

  it 'exports an object', ->
    assert.isObject blueprintTransactions

  describe 'compile(ast, filename, callback)', ->
    it 'is defined function', ->
      assert.isFunction blueprintTransactions.compile

    it 'returns an object', (done) ->
      blueprintTransactions.compile(ast, null, (err, result) ->
        assert.isNotOk err
        assert.isObject result
        done()
      )

    describe 'returned object', ->
      returnedObject = null
      beforeEach (done) ->
        blueprintTransactions.compile(ast, './apiary.apibs', (err, result) ->
          returnedObject = result
          done()
        )

      keys = [
        'transactions'
        'errors'
        'warnings'
      ]

      for key in keys then do (key) ->
        it "it has key #{key}", ->
          assert.property returnedObject, key

      describe 'every item in `transactions` array', ->
        it 'should have the "name" property set', ->
          for transaction, index in returnedObject.transactions
            assert.property transaction, 'name', "Missing 'name' property on transaction #{index}"

        it 'shoud have the "path" property set', ->
          for transaction, index in returnedObject.transactions
            # console.log transaction.path
            assert.property transaction, 'path', "Missing 'path' property on transaction #{index}"
