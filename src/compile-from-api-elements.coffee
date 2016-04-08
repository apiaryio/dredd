
{child, children, parent, content} = require('./refract')
validateParameters = require('./validate-parameters')
detectTransactionExamples = require('./detect-transaction-examples')
expandUriTemplateWithParameters = require('./expand-uri-template-with-parameters')


compileFromApiElements = (parseResult, filename) ->
  transactions = []
  annotations = {errors: [], warnings: []}

  origin = 'apiDescriptionParser'
  for annotation in children(parseResult, {element: 'annotation'})
    if annotation.meta.classes[0] is 'warning'
      group = annotations.warnings
    else
      group = annotations.errors
    group.push({
      origin
      code: content(annotation.attributes?.code)
      message: content(annotation)
      location: content(annotation.attributes?.sourceMap)
    })

  children(parseResult, {element: 'transition'}).map(detectTransactionExamples)

  for httpTransaction in children(parseResult, {element: 'httpTransaction'})
    resource = parent(httpTransaction, parseResult, {element: 'resource'})
    httpRequest = child(httpTransaction, {element: 'httpRequest'})
    httpResponse = child(httpTransaction, {element: 'httpResponse'})

    transactions.push(
      origin: compileOrigin(filename, parseResult, httpTransaction)
      pathOrigin: compilePathOrigin(filename, parseResult, httpTransaction)
      request: compileRequest(parseResult, httpRequest, annotations)
      response: compileResponse(httpResponse)
    )

  {transactions, errors: annotations.errors, warnings: annotations.warnings}


compileRequest = (parseResult, httpRequest, annotations) ->
  messageBody = child(httpRequest, {element: 'asset', 'meta.classes': 'messageBody'})

  {
    method: content(httpRequest.attributes.method)
    uri: compileUri(parseResult, httpRequest, annotations)
    headers: compileHeaders(child(httpRequest, {element: 'httpHeaders'}))
    body: content(messageBody) or ''
  }


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


compileUri = (parseResult, httpRequest, annotations) ->
  resource = parent(httpRequest, parseResult, {element: 'resource'})
  transition = parent(httpRequest, parseResult, {element: 'transition'})

  cascade = [
    resource.attributes
    transition.attributes
    httpRequest.attributes
  ]

  parameters = {}
  href = undefined

  for attributes in cascade
    href = content(attributes.href) if attributes?.href
    for own name, parameter of compileParameters(attributes?.hrefVariables)
      parameters[name] = parameter


  result = validateParameters(parameters)

  origin = 'transactionsCompiler'
  for error in result.errors
    annotations.errors.push({origin, message: error})
  for warning in result.warnings
    annotations.warnings.push({origin, message: warning})

  result = expandUriTemplateWithParameters(href, parameters)

  origin = 'transactionsCompiler'
  for error in result.errors
    annotations.errors.push({origin, message: error})
  for warning in result.warnings
    annotations.warnings.push({origin, message: warning})

  result.uri


compileParameters = (hrefVariables) ->
  parameters = {}
  for member in children(hrefVariables, {element: 'member'})
    {key, value} = content(member)

    name = content(key)
    types = (content(member.attributes?.typeAttributes) or [])

    if value?.element is 'enum'
      example = content(content(value)[0])
    else
      example = content(value)

    parameters[name] =
      required: 'required' in types
      default: content(value.attributes?.default)
      example: example
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
    filename
    apiName: content(api.meta?.title) or filename
    resourceGroupName: content(resourceGroup?.meta?.title)
    exampleName
    resourceName: content(resource.meta?.title) or content(resource.attributes?.href)
    actionName: content(transition.meta?.title) or content(httpRequest.attributes.method)
  }


compilePathOrigin = (filename, parseResult, httpTransaction) ->
  api = parent(httpTransaction, parseResult, {element: 'category', 'meta.classes': 'api'})
  resourceGroup = parent(httpTransaction, parseResult, {element: 'category', 'meta.classes': 'resourceGroup'})
  resource = parent(httpTransaction, parseResult, {element: 'resource'})
  transition = parent(httpTransaction, parseResult, {element: 'transition'})
  httpRequest = child(httpTransaction, {element: 'httpRequest'})

  {
    apiName: content(api.meta?.title)
    resourceGroupName: content(resourceGroup?.meta?.title)
    exampleName: "Example #{httpTransaction.attributes.example}"
    resourceName: content(resource.meta?.title) or content(resource.attributes?.href)
    actionName: content(transition.meta?.title) or content(httpRequest.attributes.method)
  }


module.exports = {compileFromApiElements}
