{assert} = require 'chai'

transactionName = require '../../src/transaction-name'

describe 'transactionName', () ->
  it 'is a function', () ->
    assert.isFunction transactionName
