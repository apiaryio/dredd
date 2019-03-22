/**
 * Decides whether given string is a URL or not
 *
 * @param {string} location
 * @returns {boolean}
 */
module.exports = function isURL(location) {
  return /^http(s)?:\/\//.test(location);
};
