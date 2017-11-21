const {assert} = require('chai');

const getTransactionPath = require('../../../src/transaction-path');
const {ESCAPE_CHAR, DELIMITER} = require('../../../src/transaction-path/constants');

describe('getTransactionPath', function() {
  it('is a function', () => assert.isFunction(getTransactionPath));

  return describe('path compilation', function() {
    const transaction = null;
    let result = null;

    describe('Full notation with multiple request-response pairs', function() {
      before(function() {
        const pathOrigin = {
          "apiName": "Some API Name",
          "resourceGroupName": "Some Group Name",
          "resourceName": "Some Resource Name",
          "actionName": "Some Action Name",
          "exampleName": "Example 2"
        };

        return result = getTransactionPath(pathOrigin);
      });

      return it('should return an appropriate path', () => assert.equal(result, "Some API Name:Some Group Name:Some Resource Name:Some Action Name:Example 2"));
    });

    describe('Full notation with multiple request-response pairs and a colon in some name', function() {
      before(function() {
        const pathOrigin = {
          "apiName": "Some API Name",
          "resourceGroupName": "Some Group Name",
          "resourceName": "Some Resource Name",
          "actionName": "Some Action Name",
          "exampleName": "Example 2"
        };

        return result = getTransactionPath(pathOrigin);
      });

      return it('should return an appropriate path', () => assert.equal(result, "Some API Name:Some Group Name:Some Resource Name:Some Action Name:Example 2"));
    });



    describe('Full notation without group', function() {
      before(function() {
        const pathOrigin = {
          "apiName": "Some API Name",
          "resourceGroupName": '',
          "resourceName": "Some Resource Name",
          "actionName": "Some Action Name",
          "exampleName": "Example 1"
        };

        return result = getTransactionPath(pathOrigin);
      });

      return it('should return an appropriate path', () => assert.equal(result, "Some API Name::Some Resource Name:Some Action Name:Example 1"));
    });

    describe('Full notation without group and API name', function() {
      before(function() {
        const pathOrigin = {
          "apiName": '',
          "resourceGroupName": '',
          "resourceName": "Some Resource Name",
          "actionName": "Some Action Name",
          "exampleName": "Example 1"
        };

        return result = getTransactionPath(pathOrigin);
      });

      return it('should return an appropriate path', () => assert.equal(result, "::Some Resource Name:Some Action Name:Example 1"));
    });

    describe('Full notation without group and API name with used delimiter character', function() {
      before(function() {
        const pathOrigin = {
          "apiName": '',
          "resourceGroupName": '',
          "resourceName": "Some Resource Name",
          "actionName": `Some Action Name${DELIMITER} Colon`,
          "exampleName": "Example 1"
        };

        return result = getTransactionPath(pathOrigin);
      });

      return it('should return an appropriate path', () => assert.equal(result, "::Some Resource Name:Some Action Name\\: Colon:Example 1"));
    });

    describe('Full notation without group and API name with used escape character without delimiter character', function() {
      before(function() {
        const pathOrigin = {
          "apiName": '',
          "resourceGroupName": '',
          "resourceName": "Some Resource Name",
          "actionName": `Some Action Name${ESCAPE_CHAR} Backslash`,
          "exampleName": "Example 1"
        };

        return result = getTransactionPath(pathOrigin);
      });

      return it('should return an appropriate path', () => assert.equal(result, "::Some Resource Name:Some Action Name\\ Backslash:Example 1"));
    });

    describe('Full notation without group and API name with used escape character with delimiter character', function() {
      before(function() {
        const pathOrigin = {
          "apiName": '',
          "resourceGroupName": '',
          "resourceName": "Some Resource Name",
          "actionName": `Some Action Name${ESCAPE_CHAR}${DELIMITER} Backslash with Delimiter`,
          "exampleName": "Example 1"
        };

        return result = getTransactionPath(pathOrigin);
      });

      return it('should return an appropriate path', () => assert.equal(result, "::Some Resource Name:Some Action Name\\\\: Backslash with Delimiter:Example 1"));
    });

    return describe('Simplified notation', function() {
      before(function() {
        const pathOrigin = {
          "apiName": '',
          "resourceGroupName": '',
          "resourceName": "/message",
          "actionName": "GET",
          "exampleName": "Example 1"
        };

        return result = getTransactionPath(pathOrigin);
      });

      return it('should return an appropriate path', () => assert.equal(result, "::/message:GET:Example 1"));
    });
  });
});
