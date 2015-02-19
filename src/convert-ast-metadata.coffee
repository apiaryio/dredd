convertAstMetadata = (metadata) ->
  result = {}
  if Array.isArray metadata
    for item in metadata
      dupItem = JSON.parse(JSON.stringify(item))
      name = dupItem['name']
      delete dupItem['name']

      result[name] = dupItem

  result

module.exports = convertAstMetadata
