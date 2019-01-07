const { assert } = require('chai');

const getTransactionPath = require('../../../lib/transaction-path');
const { ESCAPE_CHAR, DELIMITER } = require('../../../lib/transaction-path/constants');

describe('getTransactionPath()', () => {
  it('is a function', () => assert.isFunction(getTransactionPath));

  describe('path compilation', () => {
    let result = null;

    describe('Full notation with multiple request-response pairs', () => {
      before(() => {
        const pathOrigin = {
          apiName: 'Some API Name',
          resourceGroupName: 'Some Group Name',
          resourceName: 'Some Resource Name',
          actionName: 'Some Action Name',
          exampleName: 'Example 2'
        };

        result = getTransactionPath(pathOrigin);
      });

      it('should return an appropriate path', () => assert.equal(result, 'Some API Name:Some Group Name:Some Resource Name:Some Action Name:Example 2'));
    });

    describe('Full notation with multiple request-response pairs and a colon in some name', () => {
      before(() => {
        const pathOrigin = {
          apiName: 'Some API Name',
          resourceGroupName: 'Some Group Name',
          resourceName: 'Some Resource Name',
          actionName: 'Some Action Name',
          exampleName: 'Example 2'
        };

        result = getTransactionPath(pathOrigin);
      });

      it('should return an appropriate path', () => assert.equal(result, 'Some API Name:Some Group Name:Some Resource Name:Some Action Name:Example 2'));
    });


    describe('Full notation without group', () => {
      before(() => {
        const pathOrigin = {
          apiName: 'Some API Name',
          resourceGroupName: '',
          resourceName: 'Some Resource Name',
          actionName: 'Some Action Name',
          exampleName: 'Example 1'
        };

        result = getTransactionPath(pathOrigin);
      });

      it('should return an appropriate path', () => assert.equal(result, 'Some API Name::Some Resource Name:Some Action Name:Example 1'));
    });

    describe('Full notation without group and API name', () => {
      before(() => {
        const pathOrigin = {
          apiName: '',
          resourceGroupName: '',
          resourceName: 'Some Resource Name',
          actionName: 'Some Action Name',
          exampleName: 'Example 1'
        };

        result = getTransactionPath(pathOrigin);
      });

      it('should return an appropriate path', () => assert.equal(result, '::Some Resource Name:Some Action Name:Example 1'));
    });

    describe('Full notation without group and API name with used delimiter character', () => {
      before(() => {
        const pathOrigin = {
          apiName: '',
          resourceGroupName: '',
          resourceName: 'Some Resource Name',
          actionName: `Some Action Name${DELIMITER} Colon`,
          exampleName: 'Example 1'
        };

        result = getTransactionPath(pathOrigin);
      });

      it('should return an appropriate path', () => assert.equal(result, '::Some Resource Name:Some Action Name\\: Colon:Example 1'));
    });

    describe('Full notation without group and API name with used escape character without delimiter character', () => {
      before(() => {
        const pathOrigin = {
          apiName: '',
          resourceGroupName: '',
          resourceName: 'Some Resource Name',
          actionName: `Some Action Name${ESCAPE_CHAR} Backslash`,
          exampleName: 'Example 1'
        };

        result = getTransactionPath(pathOrigin);
      });

      it('should return an appropriate path', () => assert.equal(result, '::Some Resource Name:Some Action Name\\ Backslash:Example 1'));
    });

    describe('Full notation without group and API name with used escape character with delimiter character', () => {
      before(() => {
        const pathOrigin = {
          apiName: '',
          resourceGroupName: '',
          resourceName: 'Some Resource Name',
          actionName: `Some Action Name${ESCAPE_CHAR}${DELIMITER} Backslash with Delimiter`,
          exampleName: 'Example 1'
        };

        result = getTransactionPath(pathOrigin);
      });

      it('should return an appropriate path', () => assert.equal(result, '::Some Resource Name:Some Action Name\\\\: Backslash with Delimiter:Example 1'));
    });

    describe('Simplified notation', () => {
      before(() => {
        const pathOrigin = {
          apiName: '',
          resourceGroupName: '',
          resourceName: '/message',
          actionName: 'GET',
          exampleName: 'Example 1'
        };

        result = getTransactionPath(pathOrigin);
      });

      it('should return an appropriate path', () => assert.equal(result, '::/message:GET:Example 1'));
    });
  });
});
