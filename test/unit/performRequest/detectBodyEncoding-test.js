import { assert } from 'chai'

import { detectBodyEncoding } from '../../../lib/performRequest'

describe('performRequest._detectBodyEncoding()', () => {
  it('detects binary content as Base64', () =>
    assert.equal(
      detectBodyEncoding(Buffer.from([0xff, 0xef, 0xbf, 0xbe])),
      'base64'
    ))
  it('detects textual content as UTF-8', () =>
    assert.equal(detectBodyEncoding(Buffer.from('řeřicha')), 'utf-8'))
  it('detects no content as UTF-8', () =>
    assert.equal(detectBodyEncoding(Buffer.from([])), 'utf-8'))
})
