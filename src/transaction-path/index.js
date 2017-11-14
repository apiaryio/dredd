
const {ESCAPE_CHAR, DELIMITER} = require('./constants');


const escapeOriginPart = function(part) {
  const clonedPart = new String(part);
  return clonedPart.replace(new RegExp(DELIMITER, 'g'), `${ESCAPE_CHAR}${DELIMITER}`);
};


module.exports = function(pathOrigin) {
  let path;
  return path =
    escapeOriginPart(pathOrigin.apiName) + DELIMITER +
    escapeOriginPart(pathOrigin.resourceGroupName) + DELIMITER +
    escapeOriginPart(pathOrigin.resourceName) + DELIMITER +
    escapeOriginPart(pathOrigin.actionName) + DELIMITER +
    escapeOriginPart(pathOrigin.exampleName);
};
