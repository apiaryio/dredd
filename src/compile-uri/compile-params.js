module.exports = function(hrefVariablesElement) {
  const params = {};
  if (!hrefVariablesElement) { return params; }

  hrefVariablesElement.forEach(function(valueElement, keyElement, memberElement) {
    const name = keyElement.toValue();
    const typeAttributes = memberElement.attributes.getValue('typeAttributes') || [];
    const values = valueElement.attributes.getValue('enumerations') || [];

    return params[name] = {
      required: Array.from(typeAttributes).includes('required'),
      default: valueElement.attributes.getValue('default'),
      example: valueElement.toValue() || values[0],
      values
    };
  });
  return params;
};
