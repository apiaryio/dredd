fs = require 'fs'
path = require 'path'
{assert} = require 'chai'
protagonist = require 'protagonist'
blueprintTransactions = require '../../../src/blueprint-transactions'

describe 'blueprintTransactions [BLUEPRINT]', ->
  ast = undefined
  filename = path.join __dirname, '../../fixtures/blueprint.apib'

  before (done) ->
    code = fs.readFileSync(filename).toString()
    protagonist.parse code, {type: 'ast'}, (err, result) ->
      return done(err) if err
      ast = result['ast']
      done()

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
