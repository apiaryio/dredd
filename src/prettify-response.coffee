html = require 'html'

logger = require './logger'

prettifyResponse = (response) ->
  stringify = (obj) ->
    try
      if typeof obj is 'string'
        obj = JSON.parse(obj)
      obj = JSON.stringify obj, null, 2
    catch e
      logger.debug "Could not stringify: " + obj
    obj

  prettifyBody = (body, contentType) ->
    switch contentType
      when 'application/json'
        body = stringify body
      when 'text/html'
        body = html.prettyPrint body, {indent_size: 2}
    body


  contentType = (response?.headers['content-type'] || response?.headers['Content-Type']) if response?.headers?

  stringRepresentation = ""

  for own key, value of response
    if key is 'body'
      value = '\n' + prettifyBody value, contentType
    else if key is 'schema'
      value = '\n' + stringify value
    else if key is 'headers'
      header = '\n'
      for own hkey, hval of value
        header += "    #{hkey}: #{hval}\n"
      value = header

    stringRepresentation += "#{key}: #{value}\n"

  return stringRepresentation

module.exports = prettifyResponse
