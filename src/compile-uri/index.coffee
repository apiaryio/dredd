compileParams = require('./compile-params')
validateParams = require('./validate-params')
expandUriTemplate = require('./expand-uri-template')


module.exports = (httpRequestElement) ->
  annotations = {errors: [], warnings: []}
  cascade = [
    httpRequestElement.parents.find('resource')
    httpRequestElement.parents.find('transition')
    httpRequestElement
  ]

  # The last non-empty href overrides any previous hrefs
  href = cascade
    .map((element) -> element.href?.toValue())
    .filter((href) -> !!href)
    .pop()

  # Support for 'httpRequest' parameters is experimental. The element does
  # not have the '.hrefVariables' convenience property yet. If it's added in
  # the future, '.attributes.get('hrefVariables')' can be replaced
  # with '.hrefVariables'.
  params = cascade
    .map((element) -> compileParams(element.attributes.get('hrefVariables')))
    .reduce(overrideParams, {})

  result = validateParams(params)
  component = 'parametersValidation'
  for error in result.errors
    annotations.errors.push({component, message: error})
  for warning in result.warnings
    annotations.warnings.push({component, message: warning})

  result = expandUriTemplate(href, params)
  component = 'uriTemplateExpansion'
  for error in result.errors
    annotations.errors.push({component, message: error})
  for warning in result.warnings
    annotations.warnings.push({component, message: warning})

  {uri: result.uri, annotations}


overrideParams = (params, paramsToOverride) ->
  params[name] = param for own name, param of paramsToOverride
  return params
