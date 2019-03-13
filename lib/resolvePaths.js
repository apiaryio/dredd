const fs = require('fs');
const path = require('path');
const glob = require('glob');


// Ensure platform-agnostic 'path.basename' function
const basename = process.platform === 'win32' ? path.win32.basename : path.basename;


function resolveGlob(workingDirectory, pattern) {
  // 'glob.sync()' does not resolve paths, only glob patterns
  if (glob.hasMagic(pattern)) {
    return glob.sync(pattern, { cwd: workingDirectory })
      .map(matchingPath => path.resolve(workingDirectory, matchingPath));
  }
  const resolvedPath = path.resolve(workingDirectory, pattern);
  return fs.existsSync(resolvedPath) ? [resolvedPath] : [];
}


/**
 * Resolve paths to files
 *
 * Resolves glob patterns and sorts the files alphabetically by their basename.
 * Throws in case there's a pattern which doesn't resolve to any existing files.
 */
module.exports = function resolvePaths(workingDirectory, patterns) {
  if (!patterns || patterns.length < 1) { return []; }

  const resolvedPaths = patterns
    .map((pattern) => {
      const paths = resolveGlob(workingDirectory, pattern);
      if (paths.length < 1) {
        throw new Error(`Could not find any files on path: '${pattern}'`);
      }
      return paths;
    })
    .reduce((flatPaths, paths) => flatPaths.concat(paths), [])
    .sort((p1, p2) => {
      const [basename1, basename2] = [basename(p1), basename(p2)];
      if (basename1 < basename2) return -1;
      if (basename1 > basename2) return 1;
      return 0;
    });

  return Array.from(new Set(resolvedPaths)); // keep only unique items
};
