flattenHeaders = (blueprintHeaders) ->
  flatHeaders = {}
  # flatten headers object from blueprint structure
  for name, values of blueprintHeaders
    flatHeaders[name] = values['value']
  return flatHeaders

module.exports = flattenHeaders
