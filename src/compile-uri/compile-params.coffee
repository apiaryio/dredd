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
