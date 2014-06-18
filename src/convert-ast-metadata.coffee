convertAstMetadata = (metadata) ->
  result = {}
  if Array.isArray metadata
    for item in metadata
      name = item['name']
      delete item['name']
      
      result[name] = item
    
  result

module.exports = convertAstMetadata