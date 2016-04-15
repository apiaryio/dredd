{assert} = require 'chai'

getTransactionPath = require '../../../src/transaction-path/get-transaction-path'
{ESCAPE_CHAR, DELIMITER} = require '../../../src/transaction-path/constants'

describe 'getTransactionPath', ->
  it 'is a function', ->
    assert.isFunction getTransactionPath

  describe 'path compilation', ->
    transaction = null
    result = null

    describe 'Full notation with multiple request-response pairs', ->
      before ->
        transaction =
          pathOrigin:
            "apiName": "Some API Name"
            "resourceGroupName": "Some Group Name"
            "resourceName": "Some Resource Name"
            "actionName": "Some Action Name"
            "exampleName": "Example 2"

        result = getTransactionPath(transaction)

      it 'should return an appropriate path', ->
        assert.equal result, "Some API Name:Some Group Name:Some Resource Name:Some Action Name:Example 2"

    describe 'Full notation with multiple request-response pairs and a colon in some name', ->
      before ->
        transaction =
          pathOrigin:
            "apiName": "Some API Name"
            "resourceGroupName": "Some Group Name"
            "resourceName": "Some Resource Name"
            "actionName": "Some Action Name"
            "exampleName": "Example 2"

        result = getTransactionPath(transaction)

      it 'should return an appropriate path', ->
        assert.equal result, "Some API Name:Some Group Name:Some Resource Name:Some Action Name:Example 2"



    describe 'Full notation without group', ->
      before ->
        transaction =
          pathOrigin:
            "apiName": "Some API Name"
            "resourceGroupName": ''
            "resourceName": "Some Resource Name"
            "actionName": "Some Action Name"
            "exampleName": "Example 1"

        result = getTransactionPath(transaction)

      it 'should return an appropriate path', ->
        assert.equal result, "Some API Name::Some Resource Name:Some Action Name:Example 1"

    describe 'Full notation without group and API name', ->
      before ->
        transaction =
          pathOrigin:
            "apiName": ''
            "resourceGroupName": ''
            "resourceName": "Some Resource Name"
            "actionName": "Some Action Name"
            "exampleName": "Example 1"

        result = getTransactionPath(transaction)

      it 'should return an appropriate path', ->
        assert.equal result, "::Some Resource Name:Some Action Name:Example 1"

    describe 'Full notation without group and API name with used delimiter character', ->
      before ->
        transaction =
          pathOrigin:
            "apiName": ''
            "resourceGroupName": ''
            "resourceName": "Some Resource Name"
            "actionName": "Some Action Name#{DELIMITER} Colon"
            "exampleName": "Example 1"

        result = getTransactionPath(transaction)

      it 'should return an appropriate path', ->
        assert.equal result, "::Some Resource Name:Some Action Name\\: Colon:Example 1"

    describe 'Full notation without group and API name with used escape character without delimiter character', ->
      before ->
        transaction =
          pathOrigin:
            "apiName": ''
            "resourceGroupName": ''
            "resourceName": "Some Resource Name"
            "actionName": "Some Action Name#{ESCAPE_CHAR} Backslash"
            "exampleName": "Example 1"

        result = getTransactionPath(transaction)

      it 'should return an appropriate path', ->
        assert.equal result, "::Some Resource Name:Some Action Name\\ Backslash:Example 1"

    describe 'Full notation without group and API name with used escape character with delimiter character', ->
      before ->
        transaction =
          pathOrigin:
            "apiName": ''
            "resourceGroupName": ''
            "resourceName": "Some Resource Name"
            "actionName": "Some Action Name#{ESCAPE_CHAR}#{DELIMITER} Backslash with Delimiter"
            "exampleName": "Example 1"

        result = getTransactionPath(transaction)

      it 'should return an appropriate path', ->
        assert.equal result, "::Some Resource Name:Some Action Name\\\\: Backslash with Delimiter:Example 1"

    describe 'Simplified notation', ->
      before ->
        transaction =
          pathOrigin:
            "apiName": ''
            "resourceGroupName": ''
            "resourceName": "/message"
            "actionName": "GET"
            "exampleName": "Example 1"

        result = getTransactionPath(transaction)

      it 'should return an appropriate path', ->
        assert.equal result, "::/message:GET:Example 1"
