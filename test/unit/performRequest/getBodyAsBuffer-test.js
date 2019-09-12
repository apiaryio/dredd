import { assert } from 'chai'

import { getBodyAsBuffer } from '../../../lib/performRequest'

describe('performRequest._getBodyAsBuffer()', () => {
  describe('when the body is a Buffer', () => {
    it('returns the body unmodified', () => {
      const body = Buffer.from([0xff, 0xef, 0xbf, 0xbe])
      assert.equal(getBodyAsBuffer(body), body)
    })
    it('ignores encoding', () => {
      const body = Buffer.from([0xff, 0xef, 0xbf, 0xbe])
      assert.equal(getBodyAsBuffer(body, 'utf-8'), body)
    })
  })
  ;[undefined, null, ''].forEach((body) => {
    describe(`when the body is ${JSON.stringify(body)}`, () => {
      it('returns empty Buffer without encoding', () =>
        assert.deepEqual(getBodyAsBuffer(body), Buffer.from([])))
      it('returns empty Buffer with encoding set to UTF-8', () =>
        assert.deepEqual(getBodyAsBuffer(body, 'utf-8'), Buffer.from([])))
      it('returns empty Buffer with encoding set to Base64', () =>
        assert.deepEqual(getBodyAsBuffer(body, 'base64'), Buffer.from([])))
    })
  })

  describe('when the body is neither Buffer or string', () => {
    it('gracefully stringifies the input', () => {
      const body = new Error('Ouch!')
      assert.deepEqual(getBodyAsBuffer(body), Buffer.from('Error: Ouch!'))
    })
  })

  describe('when the body is a string', () => {
    it('assumes UTF-8 without encoding', () =>
      assert.deepEqual(getBodyAsBuffer('abc'), Buffer.from('abc')))
    it('respects encoding set to UTF-8', () =>
      assert.deepEqual(getBodyAsBuffer('abc', 'utf-8'), Buffer.from('abc')))
    it('respects encoding set to Base64', () => {
      const body = Buffer.from('abc').toString('base64')
      assert.deepEqual(getBodyAsBuffer(body, 'base64'), Buffer.from('abc'))
    })
  })
})
