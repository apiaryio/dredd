const resolvePaths = require('./resolvePaths');


function isURL(string) {
  return /^http(s)?:\/\//.test(string);
}


/**
 * Resolve locations to API description documents
 *
 * Resolves glob patterns and sorts the files alphabetically by their basename.
 * Throws in case there's a pattern which doesn't resolve to any existing files.
 * Keeps URLs as they are.
 */
module.exports = function resolveLocations(cwd, locations) {
  const { urls, paths } = locations.reduce((arrays, location) => {
    arrays[isURL(location) ? 'urls' : 'paths'].push(location);
    return arrays;
  }, { urls: [], paths: [] });

  const resolvedLocations = urls.concat(resolvePaths(cwd, paths));
  return Array.from(new Set(resolvedLocations)); // keep only unique items
};
