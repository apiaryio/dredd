
module.exports = function(params) {
  const result = {warnings: [], errors: []};

  for (let paramName in params) {
    var text;
    const param = params[paramName];
    if (param.required && !param.example && !param.default) {
      text = `Required URI parameter '${paramName}' has no example or default value.`;
      result.errors.push(text);
    }

    switch (param.type) {
      case 'number':
        if (isNaN(parseFloat(param.example))) {
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
    }

    if (param.values.length > 0) {
      if (!(param.values.indexOf(param.example) > -1)) {
        text = `URI parameter '${paramName}' example value is not one of enum values.`;
        result.errors.push(text);
      }
    }
  }

  return result;
};
