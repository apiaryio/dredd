{assert} = require 'chai'

getTransactionName = require '../../../src/transaction-name/get-transaction-name'

describe 'getTransactionName', ->
  it 'is a function', ->
    assert.isFunction getTransactionName
