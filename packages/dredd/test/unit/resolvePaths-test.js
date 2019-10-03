import path from 'path';
import { assert } from 'chai';

import resolvePaths from '../../lib/resolvePaths';

describe('resolvePaths()', () => {
  const workingDirectory = path.join(__filename, '..', '..', 'fixtures');

  describe('when given no paths', () => {
    it('produces no results', () => {
      const paths = resolvePaths(workingDirectory, []);
      assert.deepEqual(paths, []);
    });
  });

  describe('when given existing absolute filenames', () => {
    it('resolves them into absolute paths', () => {
      const paths = resolvePaths(workingDirectory, [
        path.join(workingDirectory, 'hooks.js'),
        path.join(workingDirectory, 'non-js-hooks.rb'),
      ]);
      assert.deepEqual(paths, [
        path.join(workingDirectory, 'hooks.js'),
        path.join(workingDirectory, 'non-js-hooks.rb'),
      ]);
    });
  });

  describe('when given existing relative filenames', () => {
    it('resolves them into absolute paths', () => {
      const paths = resolvePaths(workingDirectory, [
        './hooks.js',
        './non-js-hooks.rb',
      ]);
      assert.deepEqual(paths, [
        path.join(workingDirectory, 'hooks.js'),
        path.join(workingDirectory, 'non-js-hooks.rb'),
      ]);
    });
  });

  describe('when given non-existing filenames', () => {
    it('throws an error', () => {
      assert.throws(() => {
        resolvePaths(workingDirectory, ['./hooks.js', './foo/bar/42']);
      }, './foo/bar/42');
    });
  });

  describe('when given glob pattern resolving to existing files', () => {
    it('resolves them into absolute paths', () => {
      const paths = resolvePaths(workingDirectory, ['./**/hooks.js']);
      assert.deepEqual(paths, [path.join(workingDirectory, 'hooks.js')]);
    });
  });

  describe('when given glob pattern resolving to no files', () => {
    it('throws an error', () => {
      assert.throws(() => {
        resolvePaths(workingDirectory, [
          './**/hooks.js',
          './**/foo/bar/foobar.js',
        ]);
      }, './**/foo/bar/foobar.js');
    });
  });

  describe('when given both globs and filenames', () => {
    it('resolves them into absolute paths', () => {
      const paths = resolvePaths(workingDirectory, [
        './non-js-hooks.rb',
        './**/hooks.js',
      ]);
      assert.deepEqual(paths, [
        path.join(workingDirectory, 'hooks.js'),
        path.join(workingDirectory, 'non-js-hooks.rb'),
      ]);
    });

    it('throws an error on non-existing filenams', () => {
      assert.throws(() => {
        resolvePaths(workingDirectory, ['./**/hooks.js', './foo/bar/42']);
      }, './foo/bar/42');
    });

    it('throws an error on globs resolving to no files', () => {
      assert.throws(() => {
        resolvePaths(workingDirectory, [
          './hooks.js',
          './**/foo/bar/foobar.js',
        ]);
      }, './**/foo/bar/foobar.js');
    });

    it('returns the absolute paths alphabetically sorted by their basename', () => {
      const paths = resolvePaths(workingDirectory, [
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
        path.join(workingDirectory, 'hooks-glob/foo/a.js'),
        path.join(workingDirectory, 'hooks-glob/bar/b.js'),
        path.join(workingDirectory, 'hooks-glob/baz/c.js'),
        path.join(workingDirectory, 'multifile/multifile_hooks.coffee'),
        path.join(workingDirectory, 'hooks-glob/foo/o.js'),
        path.join(workingDirectory, 'hooks-glob/bar/p.js'),
        path.join(workingDirectory, 'test2_hooks.js'),
        path.join(workingDirectory, 'test_hooks.coffee'),
        path.join(workingDirectory, 'hooks-glob/baz/x.js'),
        path.join(workingDirectory, 'hooks-glob/foo/y.js'),
        path.join(workingDirectory, 'hooks-glob/bar/z.js'),
      ]);
    });
  });

  describe('when given duplicate paths', () => {
    it('returns only the distinct ones', () => {
      const paths = resolvePaths(workingDirectory, [
        './test2_hooks.js',
        './**/*_hooks.*',
        'multifile/multifile_hooks.coffee',
      ]);
      assert.deepEqual(paths, [
        path.join(workingDirectory, 'multifile/multifile_hooks.coffee'),
        path.join(workingDirectory, 'test2_hooks.js'),
        path.join(workingDirectory, 'test_hooks.coffee'),
      ]);
    });
  });
});
