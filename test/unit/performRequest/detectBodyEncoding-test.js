const { assert } = require('chai');

const {
  _detectBodyEncoding: detectBodyEncoding,
} = require('../../../lib/performRequest');


describe('performRequest._detectBodyEncoding()', () => {
  it('detects binary content as Base64', () => assert.equal(
    detectBodyEncoding(Buffer.from([0xFF, 0xEF, 0xBF, 0xBE])),
    'base64'
  ));
  it('detects textual content as UTF-8', () => assert.equal(
    detectBodyEncoding(Buffer.from('řeřicha')),
    'utf-8'
  ));
  it('detects no content as UTF-8', () => assert.equal(
    detectBodyEncoding(Buffer.from([])),
    'utf-8'
  ));
});
