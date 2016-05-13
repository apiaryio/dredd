ut = require 'uri-template'

expandUriTemplateWithParameters = (uriTemplate, parameters) ->
  result =
    errors: []
    warnings: []
    uri: null
  try
    parsed = ut.parse uriTemplate
  catch e
    text = "\n Failed to parse URI template: #{uriTemplate}"
    text += "\n Error: #{e}"
    result['errors'].push text
    return result

  # get parameters from expression object
  uriParameters = []
  for expression in parsed['expressions']
    for param in expression['params']
      uriParameters.push param['name']

  if parsed['expressions'].length is 0
    result['uri'] = uriTemplate
  else
    ambiguous = false

    for uriParameter in uriParameters
      if Object.keys(parameters).indexOf(uriParameter) is -1
        ambiguous = true
        text = "\nAmbiguous URI parameter in template: #{uriTemplate} " + \
               "\nParameter not defined in API description: " + \
               "'" + uriParameter + "'"
        result['warnings'].push text

    if ambiguous is false
      toExpand = {}
      for uriParameter in uriParameters
        param = parameters[uriParameter]
        if param['required'] is true
          if param['example'] is undefined or param['example'] is ''
            ambiguous = true
            text = "\nAmbiguous URI parameter in template: #{uriTemplate} " + \
                   "\nNo example value for required parameter in API description: " + \
                   "'" + uriParameter + "'"
            result['warnings'].push text
          else
            toExpand[uriParameter] = param['example']
        else
          if param['example'] isnt undefined and param['example'] isnt ''
            toExpand[uriParameter] = param['example']
          else if param['default'] isnt undefined and param['default'] isnt ''
            toExpand[uriParameter] = param['default']

    if ambiguous is false
      result['uri'] = parsed.expand toExpand

  return result

module.exports = expandUriTemplateWithParameters
