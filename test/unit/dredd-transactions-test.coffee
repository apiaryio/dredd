fs = require 'fs'
path = require 'path'
{assert} = require 'chai'
protagonist = require 'protagonist'
dreddTransactions = require '../../src/dredd-transactions'
ast = require '../fixtures/blueprint-ast'


describe 'dreddTransactions [AST]', ->

  it 'exports an object', ->
    assert.isObject dreddTransactions

  describe 'compile(ast, filename, callback)', ->
    it 'is defined function', ->
      assert.isFunction dreddTransactions.compile

    it 'returns an object', (done) ->
      dreddTransactions.compile(ast, null, (err, result) ->
        assert.isNotOk err
        assert.isObject result
        done()
      )

    describe 'returned object', ->
      returnedObject = null
      beforeEach (done) ->
        dreddTransactions.compile(ast, './apiary.apibs', (err, result) ->
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


describe 'dreddTransactions [BLUEPRINT]', ->
  filename = path.join __dirname, '../fixtures/blueprint.apib'
  apiDescriptionDocument = fs.readFileSync(filename).toString()

  it 'exports an object', ->
    assert.isObject dreddTransactions

  describe 'compile(apiDescriptionDocument, filename, callback)', ->
    it 'is defined function', ->
      assert.isFunction dreddTransactions.compile

    it 'returns an object', (done) ->
      dreddTransactions.compile(apiDescriptionDocument, null, (err, result) ->
        assert.isNotOk err
        assert.isObject result
        done()
      )

    describe 'returned object', ->
      returnedObject = null
      beforeEach (done) ->
        dreddTransactions.compile(apiDescriptionDocument, './apiary.apibs', (err, result) ->
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
