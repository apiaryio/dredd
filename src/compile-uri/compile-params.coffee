fury = require('fury')

{content} = require('../refract')


module.exports = (hrefVariables) ->
  parameters = {}

  for member in content(hrefVariables) or []
    {key, value} = content(member)

    name = content(key)
    types = (content(member.attributes?.typeAttributes) or [])

    if value?.element is 'enum'
      if value.attributes?.samples?.length and value.attributes?.samples[0].length
        exampleValue = content(value.attributes.samples[0][0])
      else
        exampleValue = content(content(value)[0])
      if value.attributes?.default?.length
        defaultValue = content(value.attributes.default[0])
    else
      exampleValue = content(value)
      if value.attributes?.default
        defaultValue = content(value.attributes?.default)

    parameters[name] =
      required: 'required' in types
      default: defaultValue
      example: exampleValue
      values: if value?.element is 'enum' then ({value: content(v)} for v in content(value)) else []

  parameters
