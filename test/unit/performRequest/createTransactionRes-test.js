const { assert } = require('chai');

const {
  _createTransactionRes: createTransactionRes
} = require('../../../src/performRequest');


describe('performRequest.createTransactionRes()', () => {
  const res = { statusCode: 200, headers: {} };

  it('sets the status code', () =>
    assert.deepEqual(
      createTransactionRes(res),
      { statusCode: 200, headers: {} }
    )
  );
  it('copies the headers', () => {
    const headers = { 'Content-Type': 'application/json' };
    const transactionRes = createTransactionRes({ statusCode: 200, headers });
    headers['X-Header'] = 'abcd';

    assert.deepEqual(
      transactionRes,
      { statusCode: 200, headers: { 'Content-Type': 'application/json' } }
    );
  });
  it('does not set empty body', () =>
    assert.deepEqual(
      createTransactionRes(res, Buffer.from([])),
      { statusCode: 200, headers: {} }
    )
  );
  it('sets textual body as a string with UTF-8 encoding', () =>
    assert.deepEqual(
      createTransactionRes(res, Buffer.from('řeřicha')),
      { statusCode: 200, headers: {}, body: 'řeřicha', bodyEncoding: 'utf-8' }
    )
  );
  it('sets binary body as a string with Base64 encoding', () =>
    assert.deepEqual(
      createTransactionRes(res, Buffer.from([0xFF, 0xBE])),
      {
        statusCode: 200,
        headers: {},
        body: Buffer.from([0xFF, 0xBE]).toString('base64'),
        bodyEncoding: 'base64'
      }
    )
  );
});
