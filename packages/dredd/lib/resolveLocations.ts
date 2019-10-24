import resolvePaths from './resolvePaths';
import isURL from './isURL';

/**
 * Takes an array of strings representing API description document locations
 * and resolves all relative paths and globs
 *
 * Keeps URLs intact. Keeps the original order. Throws in case there's a glob
 * pattern which doesn't resolve to any existing files.
 */
export default function resolveLocations(
  workingDirectory: string,
  locations: string[],
): string[] {
  const resolvedLocations = locations
    // resolves paths to local files, produces an array of arrays
    .map((location) =>
      isURL(location) ? [location] : resolvePaths(workingDirectory, [location]),
    )
    // flattens the array of arrays
    .reduce<string[]>((flatArray, array) => flatArray.concat(array), []);

  return Array.from(new Set(resolvedLocations));
}
