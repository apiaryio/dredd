const resolvePaths = require('./resolvePaths');


function isURL(string) {
  return /^http(s)?:\/\//.test(string);
}


function resolvePathLocationParam(workingDirectory, locationParam) {
  return resolvePaths(workingDirectory, [locationParam.location])
    .map(path => ({ location: path, isURL: locationParam.isURL }));
}


function resolveLocationParam(workingDirectory, locationParam) {
  return locationParam.isURL
    ? [locationParam]
    : resolvePathLocationParam(workingDirectory, locationParam);
}


function isNotDuplicate(locationParam, index, locationParams) {
  return !locationParams
    .slice(0, index)
    .map(previousLocationParam => previousLocationParam.location)
    .includes(locationParam.location);
}


/**
 * Takes an array of strings representing API description document locations,
 * resolves all paths, and returns an array of 'locationParam' wrapper objects.
 *
 * The 'locationParam' objects have globs and local paths resolved and they
 * contain additional meta info - whether the location is a remote URL and
 * the original order index. Throws in case there's a pattern which doesn't
 * resolve to any existing files.
 */
module.exports = function resolveLocations(workingDirectory, locations) {
  return locations
    .map(location => ({ location, isURL: isURL(location) }))
    .map(locationParam => resolveLocationParam(workingDirectory, locationParam))
    .reduce((flatLocationParams, locationParams) => flatLocationParams.concat(locationParams), [])
    .filter(isNotDuplicate)
    .map((locationParam, index) => Object.assign(locationParam, { index }));
};
