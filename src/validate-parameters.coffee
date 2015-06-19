validateParameters = (params) ->
  result = {
    warnings: []
    errors: []
  }

  for paramName, param of params
    if param['required'] == true and (param['example'] == '' or param['example'] == undefined)
      text = "Required URI parameter '#{paramName}' has no example value."
      result['errors'].push text

    switch param['type']
      when 'number'
        if isNaN(parseFloat(param['example']))
          text = "URI parameter '#{paramName}' is declared as 'number' but it is a string."
          result['errors'].push text
      when 'boolean'
        if param['example'] != 'true' and param['example'] != 'false'
          text = "URI parameter '#{paramName}' is declared as 'boolean' but it is not. "
          result['errors'].push text

    if param['values'].length > 0
      values = param['values'].map (value) -> value['value']
      unless values.indexOf(param['example']) > -1
        text = "URI parameter '#{paramName}' example value is not one of enum values."
        result['errors'].push text

  return result

module.exports = validateParameters

