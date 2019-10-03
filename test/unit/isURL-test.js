import { assert } from 'chai';

import isURL from '../../lib/isURL';

describe('isURL()', () => {
  it('recognizes HTTP URL', () => {
    assert.isTrue(isURL('http://example.com'));
  });

  it('recognizes HTTPS URL', () => {
    assert.isTrue(isURL('https://example.com'));
  });

  it('returns false for UNIX paths', () => {
    assert.isFalse(isURL('/home/honza'));
  });

  it('returns false for Windows paths', () => {
    assert.isFalse(isURL('C:\\Users\\Honza'));
  });

  it('returns false for file://', () => {
    assert.isFalse(isURL('file:///home/honza'));
  });
});
