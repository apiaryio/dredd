{Element} = require('minim')
{deserialize} = require('../refract-serialization')

{content} = require('../refract')


# Convert a Href Variables element to a Dredd Representation
# Accepts both hrefVariables minim element, and 0.6 serialised Refract hrefVariables
module.exports = (hrefVariables) ->
  params = {}
  return params unless hrefVariables

  hrefVariables.forEach((value, key, member) ->
    name = key.toValue()
    typeAttributesElement = member.attributes.get('typeAttributes')?.toValue() or []
    values = value.attributes.get('enumerations')?.toValue() or []

    params[name] =
      required: 'required' in typeAttributesElement
      default: value.attributes.get('default')?.toValue()
      example: value.toValue() or values[0]
      values: values
  )
  return params
