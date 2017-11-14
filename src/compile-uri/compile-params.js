module.exports = (hrefVariablesElement) ->
  params = {}
  return params unless hrefVariablesElement

  hrefVariablesElement.forEach((valueElement, keyElement, memberElement) ->
    name = keyElement.toValue()
    typeAttributes = memberElement.attributes.getValue('typeAttributes') or []
    values = valueElement.attributes.getValue('enumerations') or []

    params[name] =
      required: 'required' in typeAttributes
      default: valueElement.attributes.getValue('default')
      example: valueElement.toValue() or values[0]
      values: values
  )
  return params
