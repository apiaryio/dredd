const path = require('path');
const { assert } = require('chai');

const resolveHookfiles = require('../../lib/resolveHookfiles');

describe('resolveHookfiles()', () => {
  const cwd = path.join(__filename, '..', '..', 'fixtures');

  describe('when given no paths', () => it('produces no results', () => {
    const paths = resolveHookfiles([], cwd);
    assert.deepEqual(paths, []);
  }));

  describe('when given existing absolute filenames', () => it('resolves them into absolute paths', () => {
    const hookfiles = [
      path.join(cwd, 'hooks.js'),
      path.join(cwd, 'non-js-hooks.rb'),
    ];
    const paths = resolveHookfiles(hookfiles, cwd);
    assert.deepEqual(paths, hookfiles);
  }));

  describe('when given existing relative filenames', () => it('resolves them into absolute paths', () => {
    const paths = resolveHookfiles(['./hooks.js', './non-js-hooks.rb'], cwd);
    assert.deepEqual(paths, [
      path.join(cwd, 'hooks.js'),
      path.join(cwd, 'non-js-hooks.rb'),
    ]);
  }));

  describe('when given non-existing filenames', () => it('throws an error', () => assert.throws(
    () => resolveHookfiles(['./hooks.js', './foo/bar/42'], cwd),
    './foo/bar/42'
  )));

  describe('when given glob pattern resolving to existing files', () => it('resolves them into absolute paths', () => {
    const paths = resolveHookfiles(['./**/hooks.js'], cwd);
    assert.deepEqual(paths, [
      path.join(cwd, 'hooks.js'),
    ]);
  }));

  describe('when given glob pattern resolving to no files', () => it('throws an error', () => assert.throws(
    () => resolveHookfiles(['./**/hooks.js', './**/foo/bar/foobar.js'], cwd),
    './**/foo/bar/foobar.js'
  )));

  describe('when given both globs and filenames', () => {
    it('resolves them into absolute paths', () => {
      const paths = resolveHookfiles(['./non-js-hooks.rb', './**/hooks.js'], cwd);
      assert.deepEqual(paths, [
        path.join(cwd, 'hooks.js'),
        path.join(cwd, 'non-js-hooks.rb'),
      ]);
    });

    it('throws an error on non-existing filenams', () => assert.throws(
      () => resolveHookfiles(['./**/hooks.js', './foo/bar/42'], cwd),
      './foo/bar/42'
    ));

    it('throws an error on globs resolving to no files', () => assert.throws(
      () => resolveHookfiles(['./hooks.js', './**/foo/bar/foobar.js'], cwd),
      './**/foo/bar/foobar.js'
    ));

    it('returns the absolute paths alphabetically sorted', () => {
      const paths = resolveHookfiles([
        './**/*_hooks.*',
        './hooks-glob/baz/x.js',
        './hooks-glob/foo/y.js',
        './hooks-glob/bar/z.js',
        './hooks-glob/foo/a.js',
        './hooks-glob/bar/b.js',
        './hooks-glob/baz/c.js',
        './hooks-glob/foo/o.js',
        './hooks-glob/bar/p.js',
      ], cwd);
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
});
