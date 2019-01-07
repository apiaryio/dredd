const { ESCAPE_CHAR, DELIMITER } = require('./constants');

function escapeOriginPart(part) {
  const clonedPart = part.slice(0);
  return clonedPart.replace(new RegExp(DELIMITER, 'g'), `${ESCAPE_CHAR}${DELIMITER}`);
}

module.exports = function index(pathOrigin) {
  return escapeOriginPart(pathOrigin.apiName) + DELIMITER
    + escapeOriginPart(pathOrigin.resourceGroupName) + DELIMITER
    + escapeOriginPart(pathOrigin.resourceName) + DELIMITER
    + escapeOriginPart(pathOrigin.actionName) + DELIMITER
    + escapeOriginPart(pathOrigin.exampleName);
};
