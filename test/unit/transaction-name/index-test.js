// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
const { assert } = require('chai');

const getTransactionName = require('../../../src/transaction-name');


describe('getTransactionName', () => {
  it('is a function', () => assert.isFunction(getTransactionName));
  it('joins all parts of the origin object', () => {
    const name = getTransactionName({
      apiName: 'a',
      resourceGroupName: 'b',
      resourceName: 'c',
      actionName: 'd',
      exampleName: 'e'
    });
    return assert.equal(name, 'a > b > c > d > e');
  });
  it('joins just the parts of the origin object, which are available', () => {
    const name = getTransactionName({
      apiName: null,
      resourceGroupName: 'a',
      resourceName: undefined,
      actionName: 'b',
      exampleName: ''
    });
    return assert.equal(name, 'a > b');
  });
  it('returns no separators if the origin object contains just one part', () => {
    const name = getTransactionName({
      apiName: null,
      resourceGroupName: 'a',
      resourceName: undefined,
      actionName: '',
      exampleName: ''
    });
    return assert.equal(name, 'a');
  });
  return it('does not mind if any part of the origin object already contains the separator', () => {
    const name = getTransactionName({
      apiName: 'a',
      resourceGroupName: 'b',
      resourceName: 'c',
      actionName: 'd',
      exampleName: 'e > f'
    });
    return assert.equal(name, 'a > b > c > d > e > f');
  });
});
