const fs = require('fs');
const path = require('path');
const glob = require('glob');


// Ensure platform-agnostic 'path.basename' function
const basename = process.platform === 'win32' ? path.win32.basename : path.basename;


function resolveGlob(cwd, pattern) {
  // 'glob.sync()' does not resolve paths, only glob patterns
  if (glob.hasMagic(pattern)) {
    return glob.sync(pattern, { cwd })
      .map(matchingPath => path.resolve(cwd, matchingPath));
  }
  const resolvedPath = path.resolve(cwd, pattern);
  return fs.existsSync(resolvedPath) ? [resolvedPath] : [];
}


/**
 * Resolve paths to files
 *
 * Resolves glob patterns and sorts the files alphabetically by their basename.
 * Throws in case there's a pattern which doesn't resolve to any existing files.
 */
module.exports = function resolvePaths(cwd, paths) {
  if (!paths || !paths.length) { return []; }
  return paths
    .map((pattern) => {
      const resolvedPaths = resolveGlob(cwd, pattern);
      if (resolvedPaths.length < 1) {
        throw new Error(`Could not find any files on path: '${pattern}'`);
      }
      return resolvedPaths;
    })
    .reduce((flatResolvedPaths, resolvedPaths) => flatResolvedPaths.concat(resolvedPaths), [])
    .sort((p1, p2) => {
      const [basename1, basename2] = [basename(p1), basename(p2)];
      if (basename1 < basename2) return -1;
      if (basename1 > basename2) return 1;
      return 0;
    });
};
