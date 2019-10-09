function getRequired(memberElement) {
  const typeAttributes = memberElement.attributes.getValue('typeAttributes') || [];
  return typeAttributes.includes('required');
}


function getDefault(valueElement) {
  return valueElement ? valueElement.attributes.getValue('default') : undefined;
}


function getExample(valueElement) {
  if (valueElement) {
    const example = valueElement.toValue();

    if (typeof example === 'undefined' || example === null) {
      const values = valueElement.attributes.getValue('enumerations') || [];
      return values[0];
    }
    return example;
  }
  return undefined;
}


function getValues(valueElement) {
  return valueElement
    ? valueElement.attributes.getValue('enumerations') || []
    : [];
}


function compileParams(hrefVariablesElement) {
  if (!hrefVariablesElement) return {};
  return hrefVariablesElement
    .map((valueElement, keyElement, memberElement) => {
      const name = keyElement.toValue();
      return {
        [name]: {
          required: getRequired(memberElement),
          default: getDefault(valueElement),
          example: getExample(valueElement),
          values: getValues(valueElement),
        },
      };
    })
    .reduce((params, param) => Object.assign(params, param), {});
}


module.exports = compileParams;
