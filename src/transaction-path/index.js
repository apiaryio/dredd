
{ESCAPE_CHAR, DELIMITER} = require('./constants')


escapeOriginPart = (part) ->
  clonedPart = new String(part)
  clonedPart.replace(new RegExp(DELIMITER, 'g'), "#{ESCAPE_CHAR}#{DELIMITER}")


module.exports = (pathOrigin) ->
  path =
    escapeOriginPart(pathOrigin.apiName) + DELIMITER +
    escapeOriginPart(pathOrigin.resourceGroupName) + DELIMITER +
    escapeOriginPart(pathOrigin.resourceName) + DELIMITER +
    escapeOriginPart(pathOrigin.actionName) + DELIMITER +
    escapeOriginPart(pathOrigin.exampleName)
