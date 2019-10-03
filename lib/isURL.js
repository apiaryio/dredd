/**
 * Decides whether given string is a URL or not
 * @param {string} location
 * @returns {boolean}
 */
export default function isURL(location) {
  return /^http(s)?:\/\//.test(location);
}
