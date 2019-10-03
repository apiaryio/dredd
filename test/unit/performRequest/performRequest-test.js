import sinon from 'sinon'
import { assert } from 'chai'

import performRequest from '../../../lib/performRequest'

describe('performRequest()', () => {
  const uri = 'http://example.com/42'
  const uriS = 'https://example.com/42'
  const transactionReq = {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: 'Hello'
  }
  const res = { statusCode: 200, headers: { 'Content-Type': 'text/plain' } }
  const request = sinon
    .stub()
    .callsArgWithAsync(1, null, res, Buffer.from('Bye'))
  const logger = { debug: sinon.spy() }

  beforeEach(() => {
    logger.debug.resetHistory()
  })

  it('does not modify the original HTTP options object', (done) => {
    const httpOptions = { json: true }
    performRequest(uri, transactionReq, { http: httpOptions, request }, () => {
      assert.deepEqual(httpOptions, { json: true })
      done()
    })
  })
  it('does not allow to override the hardcoded HTTP options', (done) => {
    performRequest(
      uri,
      transactionReq,
      { http: { proxy: true }, request },
      () => {
        assert.isFalse(request.firstCall.args[0].proxy)
        done()
      }
    )
  })
  it('forbids the HTTP client library to respect proxy settings', (done) => {
    performRequest(uri, transactionReq, { request }, () => {
      assert.isFalse(request.firstCall.args[0].proxy)
      done()
    })
  })
  it('forbids the HTTP client library to follow redirects', (done) => {
    performRequest(uri, transactionReq, { request }, () => {
      assert.isFalse(request.firstCall.args[0].followRedirect)
      done()
    })
  })
  it('propagates the HTTP method to the HTTP client library', (done) => {
    performRequest(uri, transactionReq, { request }, () => {
      assert.equal(request.firstCall.args[0].method, transactionReq.method)
      done()
    })
  })
  it('propagates the URI to the HTTP client library', (done) => {
    performRequest(uri, transactionReq, { request }, () => {
      assert.equal(request.firstCall.args[0].uri, uri)
      done()
    })
  })
  it('propagates the HTTP request body as a Buffer', (done) => {
    performRequest(uri, transactionReq, { request }, () => {
      assert.deepEqual(request.firstCall.args[0].body, Buffer.from('Hello'))
      done()
    })
  })
  it('handles exceptions when preparing the HTTP request body', (done) => {
    const invalidTransactionReq = Object.assign(
      { bodyEncoding: 'latin2' },
      transactionReq
    )
    performRequest(uri, invalidTransactionReq, { request }, (err) => {
      assert.instanceOf(err, Error)
      done()
    })
  })
  it('logs before performing the HTTP request', (done) => {
    performRequest(uri, transactionReq, { request, logger }, () => {
      assert.equal(
        logger.debug.firstCall.args[0],
        `Performing HTTP request to the server under test: POST ${uri}`
      )
      done()
    })
  })
  it('logs before performing the HTTPS request', (done) => {
    performRequest(uriS, transactionReq, { request, logger }, () => {
      assert.equal(
        logger.debug.firstCall.args[0],
        `Performing HTTPS request to the server under test: POST ${uriS}`
      )
      done()
    })
  })
  it('logs on receiving the HTTP response', (done) => {
    performRequest(uri, transactionReq, { request, logger }, () => {
      assert.equal(
        logger.debug.lastCall.args[0],
        'Handling HTTP response from the server under test'
      )
      done()
    })
  })
  it('logs on receiving the HTTPS response', (done) => {
    performRequest(uriS, transactionReq, { request, logger }, () => {
      assert.equal(
        logger.debug.lastCall.args[0],
        'Handling HTTPS response from the server under test'
      )
      done()
    })
  })
  it('handles exceptions when requesting the server under test', (done) => {
    const error = new Error('Ouch!')
    const invalidRequest = sinon.stub().throws(error)
    performRequest(uri, transactionReq, { request: invalidRequest }, (err) => {
      assert.deepEqual(err, error)
      done()
    })
  })
  it('handles errors when requesting the server under test', (done) => {
    const error = new Error('Ouch!')
    const invalidRequest = sinon.stub().callsArgWithAsync(1, error)
    performRequest(uri, transactionReq, { request: invalidRequest }, (err) => {
      assert.deepEqual(err, error)
      done()
    })
  })
  it('provides the real HTTP response object', (done) => {
    performRequest(uri, transactionReq, { request }, (err, real) => {
      assert.deepEqual(real, {
        statusCode: 200,
        headers: { 'Content-Type': 'text/plain' },
        body: 'Bye',
        bodyEncoding: 'utf-8'
      })
      done()
    })
  })
})
