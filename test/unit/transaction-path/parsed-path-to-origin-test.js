const { assert } = require('chai');

const parsedPathToOrigin = require('../../../lib/transaction-path/parsed-path-to-origin');
const parsePath = require('../../../lib/transaction-path/parse-path');

const { ESCAPE_CHAR, DELIMITER } = require('../../../lib/transaction-path/constants');

describe('parsedPathToOrigin()', () => {
  it('is a function', () => assert.isFunction(parsedPathToOrigin));

  describe('path compilation', () => {
    let transaction = null;

    describe('Full notation with multiple request-response pairs', () =>
      it('result should match the source origin', () => {
        transaction = {
          origin: {
            apiName: 'Some API Name',
            resourceGroupName: 'Some Group Name',
            resourceName: 'Some Resource Name',
            actionName: 'Some Action Name',
            exampleName: 'Example 2'
          }
        };

        const origin = parsedPathToOrigin(parsePath('Some API Name:Some Group Name:Some Resource Name:Some Action Name:Example 2'));

        assert.deepEqual(transaction.origin, origin);
      })
    );

    describe('Full notation with multiple request-response pairs and a colon in some name', () =>
      it('result should match the source origin', () => {
        transaction = {
          origin: {
            apiName: 'Some API Name',
            resourceGroupName: 'Some Group Name',
            resourceName: 'Some Resource Name',
            actionName: 'Some Action Name',
            exampleName: 'Example 2'
          }
        };

        const origin = parsedPathToOrigin(parsePath('Some API Name:Some Group Name:Some Resource Name:Some Action Name:Example 2'));

        assert.deepEqual(transaction.origin, origin);
      })
    );

    describe('Full notation without group', () =>
      it('result should match the source origin', () => {
        transaction = {
          origin: {
            apiName: 'Some API Name',
            resourceGroupName: '',
            resourceName: 'Some Resource Name',
            actionName: 'Some Action Name',
            exampleName: 'Example 1'
          }
        };

        const origin = parsedPathToOrigin(parsePath('Some API Name::Some Resource Name:Some Action Name:Example 1'));

        assert.deepEqual(transaction.origin, origin);
      })
    );

    describe('Full notation without group and API name', () =>
      it('result should match the source origin', () => {
        transaction = {
          origin: {
            apiName: '',
            resourceGroupName: '',
            resourceName: 'Some Resource Name',
            actionName: 'Some Action Name',
            exampleName: 'Example 1'
          }
        };

        const origin = parsedPathToOrigin(parsePath('::Some Resource Name:Some Action Name:Example 1'));

        assert.deepEqual(transaction.origin, origin);
      })
    );

    describe('Full notation without group and API name with used delimiter character', () =>
      it('result should match the source origin', () => {
        transaction = {
          origin: {
            apiName: '',
            resourceGroupName: '',
            resourceName: 'Some Resource Name',
            actionName: `Some Action Name${DELIMITER} Colon`,
            exampleName: 'Example 1'
          }
        };

        const origin = parsedPathToOrigin(parsePath('::Some Resource Name:Some Action Name\\: Colon:Example 1'));

        assert.deepEqual(transaction.origin, origin);
      })
    );

    describe('Full notation without group and API name with used escape character without delimiter character', () =>
      it('result should match the source origin', () => {
        transaction = {
          origin: {
            apiName: '',
            resourceGroupName: '',
            resourceName: 'Some Resource Name',
            actionName: `Some Action Name${ESCAPE_CHAR} Backslash`,
            exampleName: 'Example 1'
          }
        };

        const origin = parsedPathToOrigin(parsePath('::Some Resource Name:Some Action Name\\ Backslash:Example 1'));

        assert.deepEqual(transaction.origin, origin);
      })
    );

    describe('Full notation without group and API name with used escape character with delimiter character', () =>
      it('result should match the source origin', () => {
        transaction = {
          origin: {
            apiName: '',
            resourceGroupName: '',
            resourceName: 'Some Resource Name',
            actionName: `Some Action Name${ESCAPE_CHAR}${DELIMITER} Backslash with Delimiter`,
            exampleName: 'Example 1'
          }
        };


        const origin = parsedPathToOrigin(parsePath('::Some Resource Name:Some Action Name\\\\: Backslash with Delimiter:Example 1'));

        assert.deepEqual(transaction.origin, origin);
      })
    );

    describe('Simplified notation', () =>
      it('result should match the source origin', () => {
        transaction = {
          origin: {
            apiName: '',
            resourceGroupName: '',
            resourceName: '/message',
            actionName: 'GET',
            exampleName: 'Example 1'
          }
        };

        const origin = parsedPathToOrigin(parsePath('::/message:GET:Example 1'));

        assert.deepEqual(transaction.origin, origin);
      })
    );
  });
});
