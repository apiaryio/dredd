
clone = require('clone')

{child, children, parent, content} = require('./refract')
validateParameters = require('./validate-parameters')
detectTransactionExamples = require('./detect-transaction-examples')
expandUriTemplateWithParameters = require('./expand-uri-template-with-parameters')


compile = (mediaType, parseResult, filename) ->
  transactions = []
  errors = []
  warnings = []

  component = 'apiDescriptionParser'
  for annotation in children(parseResult, {element: 'annotation'})
    group = if annotation.meta.classes[0] is 'warning' then warnings else errors
    group.push({
      component
      code: content(annotation.attributes?.code)
      message: content(annotation)
      location: content(child(annotation.attributes?.sourceMap, {element: 'sourceMap'}))
    })

  if mediaType is 'text/vnd.apiblueprint'
    children(parseResult, {element: 'transition'}).map(detectTransactionExamples)

  for httpTransaction in children(parseResult, {element: 'httpTransaction'})
    resource = parent(httpTransaction, parseResult, {element: 'resource'})
    httpRequest = child(httpTransaction, {element: 'httpRequest'})
    httpResponse = child(httpTransaction, {element: 'httpResponse'})

    origin = compileOrigin(filename, parseResult, httpTransaction)
    {request, annotations} = compileRequest(parseResult, httpRequest)

    if request
      transactions.push({
        origin
        pathOrigin: compilePathOrigin(filename, parseResult, httpTransaction)
        request
        response: compileResponse(httpResponse)
      })

    for error in annotations.errors
      error.origin = clone(origin)
      errors.push(error)
    for warning in annotations.warnings
      warning.origin = clone(origin)
      warnings.push(warning)

  {transactions, errors, warnings}


compileRequest = (parseResult, httpRequest) ->
  messageBody = child(httpRequest, {element: 'asset', 'meta.classes': 'messageBody'})

  {uri, annotations} = compileUri(parseResult, httpRequest)
  if uri
    request = {
      method: content(httpRequest.attributes.method)
      uri
      headers: compileHeaders(child(httpRequest, {element: 'httpHeaders'}))
      body: content(messageBody) or ''
    }
  else
    request = null

  {request, annotations}


compileResponse = (httpResponse) ->
  messageBody = child(httpResponse, {element: 'asset', 'meta.classes': 'messageBody'})
  messageBodySchema = child(httpResponse, {element: 'asset', 'meta.classes': 'messageBodySchema'})

  response =
    status: content(httpResponse.attributes.statusCode)
    headers: compileHeaders(child(httpResponse, {element: 'httpHeaders'}))
    body: content(messageBody) or ''

  schema = content(messageBodySchema)
  response.schema = schema if schema

  response


compileUri = (parseResult, httpRequest) ->
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
    for own name, parameter of compileParameters(attributes?.hrefVariables)
      parameters[name] = parameter

  result = validateParameters(parameters)
  component = 'parametersValidation'
  for error in result.errors
    annotations.errors.push({component, message: error})
  for warning in result.warnings
    annotations.warnings.push({component, message: warning})

  result = expandUriTemplateWithParameters(href, parameters)
  component = 'uriTemplateExpansion'
  for error in result.errors
    annotations.errors.push({component, message: error})
  for warning in result.warnings
    annotations.warnings.push({component, message: warning})

  {uri: result.uri, annotations}


compileParameters = (hrefVariables) ->
  parameters = {}

  for member in content(hrefVariables) or []
    {key, value} = content(member)

    name = content(key)
    types = (content(member.attributes?.typeAttributes) or [])

    if value?.element is 'enum'
      if value.attributes?.samples?.length and value.attributes?.samples[0].length
        exampleValue = content(value.attributes.samples[0][0])
      else
        exampleValue = content(content(value)[0])
      if value.attributes?.default?.length
        defaultValue = content(value.attributes.default[0])
    else
      exampleValue = content(value)
      if value.attributes?.default
        defaultValue = content(value.attributes?.default)

    parameters[name] =
      required: 'required' in types
      default: defaultValue
      example: exampleValue
      values: if value?.element is 'enum' then ({value: content(v)} for v in content(value)) else []
  parameters


compileHeaders = (httpHeaders) ->
  headers = {}
  for member in children(httpHeaders, {element: 'member'})
    name = content(content(member).key)
    value = content(content(member).value)
    headers[name] = {value}
  headers


compileOrigin = (filename, parseResult, httpTransaction) ->
  api = parent(httpTransaction, parseResult, {element: 'category', 'meta.classes': 'api'})
  resourceGroup = parent(httpTransaction, parseResult, {element: 'category', 'meta.classes': 'resourceGroup'})
  resource = parent(httpTransaction, parseResult, {element: 'resource'})
  transition = parent(httpTransaction, parseResult, {element: 'transition'})
  httpRequest = child(httpTransaction, {element: 'httpRequest'})

  if content(transition.attributes.examples) > 1
    exampleName = "Example #{httpTransaction.attributes.example}"
  else
    exampleName = ''

  {
    filename: filename or ''
    apiName: content(api.meta?.title) or filename or ''
    resourceGroupName: content(resourceGroup?.meta?.title) or ''
    resourceName: content(resource.meta?.title) or content(resource.attributes?.href) or ''
    actionName: content(transition.meta?.title) or content(httpRequest.attributes.method) or ''
    exampleName
  }


compilePathOrigin = (filename, parseResult, httpTransaction) ->
  api = parent(httpTransaction, parseResult, {element: 'category', 'meta.classes': 'api'})
  resourceGroup = parent(httpTransaction, parseResult, {element: 'category', 'meta.classes': 'resourceGroup'})
  resource = parent(httpTransaction, parseResult, {element: 'resource'})
  transition = parent(httpTransaction, parseResult, {element: 'transition'})
  httpRequest = child(httpTransaction, {element: 'httpRequest'})

  {
    apiName: content(api.meta?.title) or ''
    resourceGroupName: content(resourceGroup?.meta?.title) or ''
    resourceName: content(resource.meta?.title) or content(resource.attributes?.href) or ''
    actionName: content(transition.meta?.title) or content(httpRequest.attributes.method) or ''
    exampleName: "Example #{httpTransaction.attributes.example}"
  }


module.exports = compile
