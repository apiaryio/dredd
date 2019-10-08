import sinon from 'sinon'
import { assert } from 'chai'

import { normalizeContentLengthHeader } from '../../../lib/performRequest'

describe('performRequest._normalizeContentLengthHeader()', () => {
  let headers

  const logger = { warn: sinon.spy() }
  beforeEach(() => logger.warn.resetHistory())

  describe('when there is no body and no Content-Length', () => {
    beforeEach(() => {
      headers = normalizeContentLengthHeader({}, Buffer.from(''), { logger })
    })

    it('does not warn', () => assert.isFalse(logger.warn.called))
    it('has the Content-Length header set to 0', () =>
      assert.deepPropertyVal(headers, 'Content-Length', '0'))
  })

  describe('when there is no body and the Content-Length is set to 0', () => {
    beforeEach(() => {
      headers = normalizeContentLengthHeader(
        {
          'Content-Length': '0'
        },
        Buffer.from(''),
        { logger }
      )
    })

    it('does not warn', () => assert.isFalse(logger.warn.called))
    it('has the Content-Length header set to 0', () =>
      assert.deepPropertyVal(headers, 'Content-Length', '0'))
  })

  describe('when there is body and the Content-Length is not set', () => {
    beforeEach(() => {
      headers = normalizeContentLengthHeader({}, Buffer.from('abcd'), {
        logger
      })
    })

    it('does not warn', () => assert.isFalse(logger.warn.called))
    it('has the Content-Length header set to 4', () =>
      assert.deepPropertyVal(headers, 'Content-Length', '4'))
  })

  describe('when there is body and the Content-Length is correct', () => {
    beforeEach(() => {
      headers = normalizeContentLengthHeader(
        {
          'Content-Length': '4'
        },
        Buffer.from('abcd'),
        { logger }
      )
    })

    it('does not warn', () => assert.isFalse(logger.warn.called))
    it('has the Content-Length header set to 4', () =>
      assert.deepPropertyVal(headers, 'Content-Length', '4'))
  })

  describe('when there is no body and the Content-Length is wrong', () => {
    beforeEach(() => {
      headers = normalizeContentLengthHeader(
        {
          'Content-Length': '42'
        },
        Buffer.from(''),
        { logger }
      )
    })

    it('warns about the discrepancy', () =>
      assert.match(logger.warn.lastCall.args[0], /but the real body length is/))
    it('has the Content-Length header set to 0', () =>
      assert.deepPropertyVal(headers, 'Content-Length', '0'))
  })

  describe('when there is body and the Content-Length is wrong', () => {
    beforeEach(() => {
      headers = normalizeContentLengthHeader(
        {
          'Content-Length': '42'
        },
        Buffer.from('abcd'),
        { logger }
      )
    })

    it('warns about the discrepancy', () =>
      assert.match(logger.warn.lastCall.args[0], /but the real body length is/))
    it('has the Content-Length header set to 4', () =>
      assert.deepPropertyVal(headers, 'Content-Length', '4'))
  })

  describe('when the existing header name has unusual casing', () => {
    beforeEach(() => {
      headers = normalizeContentLengthHeader(
        {
          'CoNtEnT-lEnGtH': '4'
        },
        Buffer.from('abcd'),
        { logger }
      )
    })

    it('has the CoNtEnT-lEnGtH header set to 4', () =>
      assert.deepEqual(headers, { 'CoNtEnT-lEnGtH': '4' }))
  })

  describe('when there are modifications to the headers', () => {
    const originalHeaders = {}

    beforeEach(() => {
      headers = normalizeContentLengthHeader(
        originalHeaders,
        Buffer.from('abcd'),
        { logger }
      )
    })

    it('does not modify the original headers object', () => {
      assert.deepEqual(originalHeaders, {})
      assert.deepEqual(headers, { 'Content-Length': '4' })
    })
  })
})
