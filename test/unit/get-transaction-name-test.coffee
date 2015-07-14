{assert} = require 'chai'

getTransactionName = require '../../src/get-transaction-name'

describe 'getTransactionName', () ->
  it 'is a function', () ->
    assert.isFunction getTransactionName
