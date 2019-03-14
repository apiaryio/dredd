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

  describe('when given paths', () => {
    it('resolves them into absolute paths', () => {
      const locations = resolveLocations(workingDirectory, [
        './multifile/*.apib',
        './apiary.apib',
      ]);
      assert.deepEqual(locations, [
        {
          location: path.join(workingDirectory, '/multifile/greeting.apib'),
          isURL: false,
          index: 0,
        },
        {
          location: path.join(workingDirectory, '/multifile/message.apib'),
          isURL: false,
          index: 1,
        },
        {
          location: path.join(workingDirectory, '/multifile/name.apib'),
          isURL: false,
          index: 2,
        },
        {
          location: path.join(workingDirectory, 'apiary.apib'),
          isURL: false,
          index: 3,
        },
      ]);
    });
  });

  describe('when given non-existing paths', () => {
    it('throws an error', () => {
      assert.throws(() => {
        resolveLocations(workingDirectory, ['./foo/bar/moo/boo/*.apib']);
      }, './foo/bar/moo/boo/*.apib');
    });
  });

  describe('when given HTTP URLs', () => {
    it('recognizes they are URLs', () => {
      const locations = resolveLocations(workingDirectory, [
        'http://example.com/foo.yaml',
        './apiary.apib',
      ]);
      assert.deepEqual(locations, [
        {
          location: 'http://example.com/foo.yaml',
          isURL: true,
          index: 0,
        },
        {
          location: path.join(workingDirectory, 'apiary.apib'),
          isURL: false,
          index: 1,
        },
      ]);
    });
  });

  describe('when given HTTPS URLs', () => {
    it('recognizes they are URLs', () => {
      const locations = resolveLocations(workingDirectory, [
        'https://example.com/foo.yaml',
        './apiary.apib',
      ]);
      assert.deepEqual(locations, [
        {
          location: 'https://example.com/foo.yaml',
          isURL: true,
          index: 0,
        },
        {
          location: path.join(workingDirectory, 'apiary.apib'),
          isURL: false,
          index: 1,
        },
      ]);
    });
  });

  describe('when given duplicate locations', () => {
    it('returns only the distinct ones', () => {
      const locations = resolveLocations(workingDirectory, [
        './apiary.apib',
        'http://example.com/foo.yaml',
        'http://example.com/foo.yaml',
        './apiar*.apib',
      ]);
      assert.deepEqual(locations, [
        {
          location: path.join(workingDirectory, 'apiary.apib'),
          isURL: false,
          index: 0,
        },
        {
          location: 'http://example.com/foo.yaml',
          isURL: true,
          index: 1,
        },
      ]);
    });
  });

  describe('when given various locations', () => {
    it('keeps and records their original order', () => {
      const locations = resolveLocations(workingDirectory, [
        './apiar*.apib',
        'https://example.com/foo.yaml',
        './multifile/*.apib',
        'http://example.com/bar.yaml',
      ]);
      assert.deepEqual(locations, [
        {
          location: path.join(workingDirectory, 'apiary.apib'),
          isURL: false,
          index: 0,
        },
        {
          location: 'https://example.com/foo.yaml',
          isURL: true,
          index: 1,
        },
        {
          location: path.join(workingDirectory, '/multifile/greeting.apib'),
          isURL: false,
          index: 2,
        },
        {
          location: path.join(workingDirectory, '/multifile/message.apib'),
          isURL: false,
          index: 3,
        },
        {
          location: path.join(workingDirectory, '/multifile/name.apib'),
          isURL: false,
          index: 4,
        },
        {
          location: 'http://example.com/bar.yaml',
          isURL: true,
          index: 5,
        },
      ]);
    });
  });
});
