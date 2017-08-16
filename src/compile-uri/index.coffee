{parent, content} = require('../refract')

compileParams = require('./compile-params')
validateParams = require('./validate-params')
expandUriTemplate = require('./expand-uri-template')


module.exports = (parseResult, httpRequest) ->
  resource = parent(httpRequest, parseResult, {element: 'resource'})
  transition = parent(httpRequest, parseResult, {element: 'transition'})

  cascade = [
    resource.attributes
    transition.attributes
    httpRequest.attributes
  ]

  parameters = {}
  annotations = {errors: [], warnings: []}
  href = undefined

  for attributes in cascade
    href = content(attributes.href) if attributes?.href
    for own name, parameter of compileParams(attributes?.hrefVariables)
      parameters[name] = parameter

  result = validateParams(parameters)
  component = 'parametersValidation'
  for error in result.errors
    annotations.errors.push({component, message: error})
  for warning in result.warnings
    annotations.warnings.push({component, message: warning})

  result = expandUriTemplate(href, parameters)
  component = 'uriTemplateExpansion'
  for error in result.errors
    annotations.errors.push({component, message: error})
  for warning in result.warnings
    annotations.warnings.push({component, message: warning})

  {uri: result.uri, annotations}
