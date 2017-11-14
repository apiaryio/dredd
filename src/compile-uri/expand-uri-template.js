ut = require 'uri-template'


module.exports = (uriTemplate, params) ->
  result =
    errors: []
    warnings: []
    uri: null

  try
    parsed = ut.parse uriTemplate
  catch e
    result.errors.push("""\
      Failed to parse URI template: #{uriTemplate}
      Error: #{e}\
    """)
    return result

  # get parameters from expression object
  uriParameters = []
  for expression in parsed.expressions
    for param in expression.params
      uriParameters.push param.name

  if parsed.expressions.length is 0
    result.uri = uriTemplate
  else
    ambiguous = false

    for uriParameter in uriParameters
      if Object.keys(params).indexOf(uriParameter) is -1
        ambiguous = true
        result.warnings.push("""\
          Ambiguous URI parameter in template: #{uriTemplate}
          Parameter not defined in API description document: #{uriParameter}\
        """)

    unless ambiguous
      toExpand = {}
      for uriParameter in uriParameters
        param = params[uriParameter]

        if param.example
          toExpand[uriParameter] = param.example
        else if param.default
          toExpand[uriParameter] = param.default
        else
          if param.required
            ambiguous = true
            result.warnings.push("""\
              Ambiguous URI parameter in template: #{uriTemplate}
              No example value for required parameter in API description \
              document: #{uriParameter}\
            """)

        if param.required and param.default
          result.warnings.push("""\
            Required URI parameter '#{uriParameter}' has a default value.
            Default value for a required parameter doesn't make sense from \
            API description perspective. Use example value instead.\
          """)

    unless ambiguous
      result.uri = parsed.expand(toExpand)

  return result
