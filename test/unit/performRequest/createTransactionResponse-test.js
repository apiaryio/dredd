import { assert } from 'chai'

import { createTransactionResponse } from '../../../lib/performRequest'

describe('performRequest._createTransactionResponse()', () => {
  const res = { statusCode: 200, headers: {} }

  it('sets the status code', () =>
    assert.deepEqual(createTransactionResponse(res), {
      statusCode: 200,
      headers: {}
    }))
  it('copies the headers', () => {
    const headers = { 'Content-Type': 'application/json' }
    const transactionRes = createTransactionResponse({
      statusCode: 200,
      headers
    })
    headers['X-Header'] = 'abcd'

    assert.deepEqual(transactionRes, {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  })
  it('does not set empty body', () =>
    assert.deepEqual(createTransactionResponse(res, Buffer.from([])), {
      statusCode: 200,
      headers: {}
    }))
  it('sets textual body as a string with UTF-8 encoding', () =>
    assert.deepEqual(createTransactionResponse(res, Buffer.from('řeřicha')), {
      statusCode: 200,
      headers: {},
      body: 'řeřicha',
      bodyEncoding: 'utf-8'
    }))
  it('sets binary body as a string with Base64 encoding', () =>
    assert.deepEqual(
      createTransactionResponse(res, Buffer.from([0xff, 0xbe])),
      {
        statusCode: 200,
        headers: {},
        body: Buffer.from([0xff, 0xbe]).toString('base64'),
        bodyEncoding: 'base64'
      }
    ))
})
