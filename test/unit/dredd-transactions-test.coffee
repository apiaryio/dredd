proxyquire = require('proxyquire').noPreserveCache()
fs = require 'fs'
path = require 'path'
{assert} = require 'chai'
protagonist = require 'protagonist'
sinon = require 'sinon'
dreddTransactions = require '../../src/dredd-transactions'
ast = require '../fixtures/blueprint-ast'


describe 'dreddTransactions', ->
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

  describe 'when compilation throws an exception', ->
    error = new Error '... dummy message ...'

    filename = '... dummy filename ...'
    apiDescriptionDocument = '''
      # Dummy API
      ... dummy API Description ...
    '''
    callbackArguments = undefined

    before (done) ->
      dreddTransactions = proxyquire '../../src/dredd-transactions',
        './compile': (args...) ->
          throw error

      dreddTransactions.compile apiDescriptionDocument, filename, (args...) ->
        callbackArguments = args
        done()

    after ->
      dreddTransactions = require '../../src/dredd-transactions'

    it 'passes the error to callback', ->
      assert.deepEqual(callbackArguments, [error])
