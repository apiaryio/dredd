clone = require 'clone'

convertAstMetadata = (metadata) ->
  result = {}
  cloned = clone metadata
  if Array.isArray cloned
    for item in cloned
      name = item['name']
      delete item['name']

      result[name] = item

  result

module.exports = convertAstMetadata
