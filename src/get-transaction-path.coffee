{ESCAPE_CHAR, DELIMITER} = require './constants'

escapeOriginPart = (part) ->
  clonedPart = new String part
  clonedPart.replace new RegExp(DELIMITER, 'g'), "#{ESCAPE_CHAR}#{DELIMITER}"

module.exports = (transaction) ->
  origin = transaction['pathOrigin']

  path =
    escapeOriginPart(origin['apiName']) + DELIMITER +
    escapeOriginPart(origin['resourceGroupName']) + DELIMITER +
    escapeOriginPart(origin['resourceName']) + DELIMITER +
    escapeOriginPart(origin['actionName']) + DELIMITER +
    escapeOriginPart(origin['exampleName'])
