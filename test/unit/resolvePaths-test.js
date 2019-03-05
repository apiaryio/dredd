const path = require('path');
const { assert } = require('chai');

const resolvePaths = require('../../lib/resolvePaths');


describe('resolvePaths()', () => {
  const cwd = path.join(__filename, '..', '..', 'fixtures');

  describe('when given no paths', () => {
    it('produces no results', () => {
      const paths = resolvePaths(cwd, []);
      assert.deepEqual(paths, []);
    });
  });

  describe('when given existing absolute filenames', () => {
    it('resolves them into absolute paths', () => {
      const hookfiles = [
        path.join(cwd, 'hooks.js'),
        path.join(cwd, 'non-js-hooks.rb'),
      ];
      const paths = resolvePaths(cwd, hookfiles);
      assert.deepEqual(paths, hookfiles);
    });
  });

  describe('when given existing relative filenames', () => {
    it('resolves them into absolute paths', () => {
      const paths = resolvePaths(cwd, ['./hooks.js', './non-js-hooks.rb']);
      assert.deepEqual(paths, [
        path.join(cwd, 'hooks.js'),
        path.join(cwd, 'non-js-hooks.rb'),
      ]);
    });
  });

  describe('when given non-existing filenames', () => {
    it('throws an error', () => {
      assert.throws(() => {
        resolvePaths(cwd, ['./hooks.js', './foo/bar/42']);
      }, './foo/bar/42');
    });
  });

  describe('when given glob pattern resolving to existing files', () => {
    it('resolves them into absolute paths', () => {
      const paths = resolvePaths(cwd, ['./**/hooks.js']);
      assert.deepEqual(paths, [
        path.join(cwd, 'hooks.js'),
      ]);
    });
  });

  describe('when given glob pattern resolving to no files', () => {
    it('throws an error', () => {
      assert.throws(() => {
        resolvePaths(cwd, ['./**/hooks.js', './**/foo/bar/foobar.js']);
      }, './**/foo/bar/foobar.js');
    });
  });

  describe('when given both globs and filenames', () => {
    it('resolves them into absolute paths', () => {
      const paths = resolvePaths(cwd, ['./non-js-hooks.rb', './**/hooks.js']);
      assert.deepEqual(paths, [
        path.join(cwd, 'hooks.js'),
        path.join(cwd, 'non-js-hooks.rb'),
      ]);
    });

    it('throws an error on non-existing filenams', () => {
      assert.throws(() => {
        resolvePaths(cwd, ['./**/hooks.js', './foo/bar/42']);
      }, './foo/bar/42');
    });

    it('throws an error on globs resolving to no files', () => {
      assert.throws(() => {
        resolvePaths(cwd, ['./hooks.js', './**/foo/bar/foobar.js']);
      }, './**/foo/bar/foobar.js');
    });

    it('returns the absolute paths alphabetically sorted by their basename', () => {
      const paths = resolvePaths(cwd, [
        './**/*_hooks.*',
        './hooks-glob/baz/x.js',
        './hooks-glob/foo/y.js',
        './hooks-glob/bar/z.js',
        './hooks-glob/foo/a.js',
        './hooks-glob/bar/b.js',
        './hooks-glob/baz/c.js',
        './hooks-glob/foo/o.js',
        './hooks-glob/bar/p.js',
      ]);
      assert.deepEqual(paths, [
        path.join(cwd, 'hooks-glob/foo/a.js'),
        path.join(cwd, 'hooks-glob/bar/b.js'),
        path.join(cwd, 'hooks-glob/baz/c.js'),
        path.join(cwd, 'multifile/multifile_hooks.coffee'),
        path.join(cwd, 'hooks-glob/foo/o.js'),
        path.join(cwd, 'hooks-glob/bar/p.js'),
        path.join(cwd, 'test2_hooks.js'),
        path.join(cwd, 'test_hooks.coffee'),
        path.join(cwd, 'hooks-glob/baz/x.js'),
        path.join(cwd, 'hooks-glob/foo/y.js'),
        path.join(cwd, 'hooks-glob/bar/z.js'),
      ]);
    });
  });

  describe('when given duplicate paths', () => {
    it('returns only the distinct ones', () => {
      const paths = resolvePaths(cwd, [
        './test2_hooks.js',
        './**/*_hooks.*',
        'multifile/multifile_hooks.coffee',
      ]);
      assert.deepEqual(paths, [
        path.join(cwd, 'multifile/multifile_hooks.coffee'),
        path.join(cwd, 'test2_hooks.js'),
        path.join(cwd, 'test_hooks.coffee'),
      ]);
    });
  });
});
