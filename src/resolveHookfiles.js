const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Ensure platform agnostic path.basename function
const basename = process.platform === 'win32' ? path.win32.basename : path.basename;

// Expand hookfiles - sort files alphabetically and resolve their paths
module.exports = function resolveHookfiles(hookfiles, cwd = null) {
  if (!hookfiles || !hookfiles.length) { return []; }

  cwd = cwd || process.cwd();

  return hookfiles.map((hookfile) => {
    // glob.sync does not resolve paths, only glob patterns
    let resolvedPaths;
    if (glob.hasMagic(hookfile)) {
      resolvedPaths = glob.sync(hookfile, { cwd }).map(p => path.resolve(cwd, p));
    } else {
      const resolvedPath = path.resolve(cwd, hookfile);
      resolvedPaths = fs.existsSync(resolvedPath) ? [resolvedPath] : [];
    }

    if (!resolvedPaths.length) {
      throw new Error(`Could not find any hook file(s) on path: '${hookfile}'`);
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
