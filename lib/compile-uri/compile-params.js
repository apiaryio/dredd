module.exports = function compileParams(hrefVariablesElement) {
  const params = {};

  if (!hrefVariablesElement) return params;

  hrefVariablesElement.forEach((valueElement, keyElement, memberElement) => {
    const name = keyElement.toValue();
    const typeAttributes = memberElement.attributes.getValue('typeAttributes') || [];
    const values = valueElement.attributes.getValue('enumerations') || [];

    const example = valueElement.toValue();
    params[name] = {
      required: Array.from(typeAttributes).includes('required'),
      default: valueElement.attributes.getValue('default'),
      example: typeof example === 'undefined' || example === null ? values[0] : example,
      values,
    };

    return params;
  });
  return params;
};
