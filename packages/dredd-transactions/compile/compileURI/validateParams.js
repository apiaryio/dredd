module.exports = function validateParams(params) {
  const result = { warnings: [], errors: [] };

  Object.keys(params).forEach((paramName) => {
    let text;
    const param = params[paramName];

    if (param.required && !(typeof param.example !== 'undefined' && param.example !== '') && !(typeof param.default !== 'undefined' && param.default !== '')) {
      text = `Required URI parameter '${paramName}' has no example or default value.`;
      result.errors.push(text);
    }

    switch (param.type) {
      case 'number':
        if (Number.isNaN(parseFloat(param.example))) {
          text = `URI parameter '${paramName}' is declared as 'number' but it is a string.`;
          result.errors.push(text);
        }
        break;
      case 'boolean':
        if ((param.example !== 'true') && (param.example !== 'false')) {
          text = `URI parameter '${paramName}' is declared as 'boolean' but it is not.`;
          result.errors.push(text);
        }
        break;
      default:
        break;
    }

    if (param.values.length > 0) {
      if (!(param.values.indexOf(param.example) > -1)) {
        text = `URI parameter '${paramName}' example value is not one of enum values.`;
        result.errors.push(text);
      }
    }
  });

  return result;
};
