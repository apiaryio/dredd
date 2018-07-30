const { assert } = require('chai');

const { normalizeBodyEncoding } = require('../../../src/performRequest');


describe('performRequest.normalizeBodyEncoding()', () => {
  ['utf-8', 'utf8', 'UTF-8', 'UTF8'].forEach(value =>
    it(`normalizes ${JSON.stringify(value)} to utf-8`, () =>
      assert.equal(normalizeBodyEncoding(value), 'utf-8')
    )
  );
  ['base64', 'Base64'].forEach(value =>
    it(`normalizes ${JSON.stringify(value)} to base64`, () =>
      assert.equal(normalizeBodyEncoding(value), 'base64')
    )
  );
  [undefined, null, '', false].forEach(value =>
    it(`defaults ${JSON.stringify(value)} to utf-8`, () =>
      assert.equal(normalizeBodyEncoding(value), 'utf-8')
    )
  );
  it('throws an error on "latin2"', () =>
    assert.throws(() => {
      normalizeBodyEncoding('latin2');
    }, /^unsupported encoding/i)
  );
});
