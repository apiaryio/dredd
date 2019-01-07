const { assert } = require('chai');

const getTransactionName = require('../../../lib/transaction-name');

describe('getTransactionName()', () => {
  it('is a function', () => assert.isFunction(getTransactionName));

  it('joins all parts of the origin object', () => {
    const name = getTransactionName({
      apiName: 'a',
      resourceGroupName: 'b',
      resourceName: 'c',
      actionName: 'd',
      exampleName: 'e',
    });
    assert.equal(name, 'a > b > c > d > e');
  });

  it('joins just the parts of the origin object, which are available', () => {
    const name = getTransactionName({
      apiName: null,
      resourceGroupName: 'a',
      resourceName: undefined,
      actionName: 'b',
      exampleName: '',
    });
    assert.equal(name, 'a > b');
  });

  it('returns no separators if the origin object contains just one part', () => {
    const name = getTransactionName({
      apiName: null,
      resourceGroupName: 'a',
      resourceName: undefined,
      actionName: '',
      exampleName: '',
    });
    assert.equal(name, 'a');
  });

  it('does not mind if any part of the origin object already contains the separator', () => {
    const name = getTransactionName({
      apiName: 'a',
      resourceGroupName: 'b',
      resourceName: 'c',
      actionName: 'd',
      exampleName: 'e > f',
    });
    assert.equal(name, 'a > b > c > d > e > f');
  });
});
