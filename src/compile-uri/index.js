const compileParams = require('./compile-params');
const validateParams = require('./validate-params');
const expandUriTemplate = require('./expand-uri-template');


module.exports = function(httpRequestElement) {
  const annotations = [];
  const cascade = [
    httpRequestElement.parents.find('resource'),
    httpRequestElement.parents.find('transition'),
    httpRequestElement
  ];

  // The last non-empty href overrides any previous hrefs
  const href = cascade
    .map(element => element.href != null ? element.href.toValue() : undefined)
    .filter(href => !!href)
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
  for (var error of result.errors) {
    annotations.push({type: 'error', component, message: error});
  }
  for (var warning of result.warnings) {
    annotations.push({type: 'warning', component, message: warning});
  }

  result = expandUriTemplate(href, params);
  component = 'uriTemplateExpansion';
  for (error of result.errors) {
    annotations.push({type: 'error', component, message: error});
  }
  for (warning of result.warnings) {
    annotations.push({type: 'warning', component, message: warning});
  }

  return {uri: result.uri, annotations};
};


var overrideParams = function(params, paramsToOverride) {
  for (let name of Object.keys(paramsToOverride || {})) { const param = paramsToOverride[name]; params[name] = param; }
  return params;
};
