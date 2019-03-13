const path = require('path');
const { assert } = require('chai');

const resolveLocations = require('../../lib/resolveLocations');


describe('resolveLocations()', () => {
  const workingDirectory = path.join(__filename, '..', '..', 'fixtures');

  describe('when given no locations', () => {
    it('produces no results', () => {
      const locations = resolveLocations(workingDirectory, []);
      assert.deepEqual(locations, []);
    });
  });

  describe('when given filenames', () => {
    it('resolves them into absolute locations', () => {
      const locations = resolveLocations(workingDirectory, [
        './multifile/*.apib',
        './apiary.apib',
      ]);
      assert.deepEqual(locations, [
        path.join(workingDirectory, 'apiary.apib'),
        path.join(workingDirectory, '/multifile/greeting.apib'),
        path.join(workingDirectory, '/multifile/message.apib'),
        path.join(workingDirectory, '/multifile/name.apib'),
      ]);
    });
  });

  describe('when given HTTP URLs', () => {
    it('keeps them as they are', () => {
      const locations = resolveLocations(workingDirectory, [
        'http://example.com/foo.yaml',
        './apiary.apib',
      ]);
      assert.deepEqual(locations, [
        'http://example.com/foo.yaml',
        path.join(workingDirectory, 'apiary.apib'),
      ]);
    });
  });

  describe('when given HTTPS URLs', () => {
    it('keeps them as they are', () => {
      const locations = resolveLocations(workingDirectory, [
        'https://example.com/foo.yaml',
        './apiary.apib',
      ]);
      assert.deepEqual(locations, [
        'https://example.com/foo.yaml',
        path.join(workingDirectory, 'apiary.apib'),
      ]);
    });
  });

  describe('when given duplicate locations', () => {
    it('returns only the distinct ones', () => {
      const locations = resolveLocations(workingDirectory, [
        'http://example.com/foo.yaml',
        './apiary.apib',
        'http://example.com/foo.yaml',
        './apiar*.apib',
      ]);
      assert.deepEqual(locations, [
        'http://example.com/foo.yaml',
        path.join(workingDirectory, 'apiary.apib'),
      ]);
    });
  });
});
