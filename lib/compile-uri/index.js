const compileParams = require('./compile-params');
const validateParams = require('./validate-params');
const expandUriTemplate = require('./expand-uri-template');

module.exports = function index(httpRequestElement) {
  const annotations = [];
  const cascade = [
    httpRequestElement.parents.find('resource'),
    httpRequestElement.parents.find('transition'),
    httpRequestElement,
  ];

  function overrideParams(params, paramsToOverride = {}) {
    const result = Object.assign({}, params);

    Object.keys(paramsToOverride).forEach((paramName) => {
      const param = paramsToOverride[paramName];
      result[paramName] = param;
    });

    return result;
  }

  // The last non-empty href overrides any previous hrefs
  const href = cascade
    .map((element) => {
      const value = element.href ? element.href.toValue() : undefined;
      return value;
    })
    .filter(hrefParam => !!hrefParam)
    .pop();

  // Support for 'httpRequest' parameters is experimental. The element does
  // not have the '.hrefVariables' convenience property yet. If it's added in
  // the future, '.attributes.get('hrefVariables')' can be replaced
  // with '.hrefVariables'.
  const params = cascade
    .map(element => compileParams(element.attributes.get('hrefVariables')))
    .reduce(overrideParams, {});

  let result = validateParams(params);
  let component = 'parametersValidation';
  result.errors.forEach(error => annotations.push({ type: 'error', component, message: error }));
  result.warnings.forEach(warning => annotations.push({ type: 'warning', component, message: warning }));

  result = expandUriTemplate(href, params);
  component = 'uriTemplateExpansion';
  result.errors.forEach(error => annotations.push({ type: 'error', component, message: error }));
  result.warnings.forEach(warning => annotations.push({ type: 'warning', component, message: warning }));

  return { uri: result.uri, annotations };
};
