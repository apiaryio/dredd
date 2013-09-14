falttenHeaders = (blueprintHeaders) ->
  flatHeaders = {}
  # flatten headers object from blueprint structure
  for name, values of blueprintHeaders
    flatHeaders[name] = values['value'].toLowerCase()
  return flatHeaders

module.exports = falttenHeaders