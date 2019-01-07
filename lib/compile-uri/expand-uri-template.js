const ut = require('uri-template');

module.exports = function expandURITemplate(uriTemplate, params) {
  let parsed;
  const result = {
    errors: [],
    warnings: [],
    uri: null,
  };

  try {
    parsed = ut.parse(uriTemplate);
  } catch (e) {
    result.errors.push(`\
Failed to parse URI template: ${uriTemplate}
Error: ${e}\
`);
    return result;
  }

  // Get parameters from expression object
  const uriParameters = parsed.expressions
    .map(expression => expression.params.map(param => param.name))
    .reduce((accumulator, current) => accumulator.concat(current), []);

  if (parsed.expressions.length === 0) {
    result.uri = uriTemplate;
  } else {
    let ambiguous = false;

    uriParameters.forEach((uriParameter) => {
      if (Object.keys(params).indexOf(uriParameter) === -1) {
        ambiguous = true;
        result.warnings.push(`\
Ambiguous URI parameter in template: ${uriTemplate}
Parameter not defined in API description document: ${uriParameter}\
`);
      }
    });

    let param;
    const toExpand = {};

    if (!ambiguous) {
      uriParameters.forEach((uriParameter) => {
        param = params[uriParameter];

        if (typeof param.example !== 'undefined' && param.example !== '') {
          toExpand[uriParameter] = param.example;
        } else if (typeof param.default !== 'undefined' && param.default !== '') {
          toExpand[uriParameter] = param.default;
        } else if (param.required) {
          ambiguous = true;
          result.warnings.push(`\
Ambiguous URI parameter in template: ${uriTemplate}
No example value for required parameter in API description \
document: ${uriParameter}\
`);
        }

        if (param.required && typeof param.default !== 'undefined' && param.default !== '') {
          result.warnings.push(`\
Required URI parameter '${uriParameter}' has a default value.
Default value for a required parameter doesn't make sense from \
API description perspective. Use example value instead.\
`);
        }
      });
    }

    if (!ambiguous) {
      result.uri = parsed.expand(toExpand);
    }
  }

  return result;
};
