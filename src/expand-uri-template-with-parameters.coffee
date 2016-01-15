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

  # check if all parameters from blueprint have an expression in URI
  for parameter in Object.keys(parameters)
    if uriParameters.indexOf(parameter) == -1
      text = "\nURI template: #{uriTemplate}\nDoesn\'t contain expression for parameter" + \
             " '" + parameter + "'"
      result['warnings'].push text

  if parsed['expressions'].length == 0
    result['uri'] = uriTemplate
  else
    ambigous = false

    for uriParameter in uriParameters
      if Object.keys(parameters).indexOf(uriParameter) == -1
        ambigous = true
        text = "\nAmbiguous URI parameter in template: #{uriTemplate} " + \
               "\nParameter not defined in blueprint:" + \
               "'" + uriParameter + "'"
        result['warnings'].push text

    if ambigous == false
      toExpand = {}
      for uriParameter in uriParameters
        param = parameters[uriParameter]
        if param['required'] == true
          if param['example'] == undefined or param['example'] == ""
            ambigous = true
            text = "\nAmbiguous URI parameter in template: #{uriTemplate} " + \
                   "\nNo example value for required parameter in blueprint:" + \
                   "'" + uriParameter + "'"
            result['warnings'].push text
          else
            toExpand[uriParameter] = param['example']
        else
          if param['example'] != undefined and param['example'] != ""
            toExpand[uriParameter] = param['example']
          else if param['default'] != undefined and param['default'] != ""
            toExpand[uriParameter] = param['default']

    if ambigous == false
      result['uri'] = parsed.expand toExpand

  return result

module.exports = expandUriTemplateWithParameters
