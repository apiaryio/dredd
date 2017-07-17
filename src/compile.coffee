clone = require('clone')
caseless = require('caseless')

{child, children, parent, content} = require('./refract')
validateParameters = require('./validate-parameters')
detectTransactionExamples = require('./detect-transaction-examples')
expandUriTemplateWithParameters = require('./expand-uri-template-with-parameters')
apiElementsToRefract = require('./api-elements-to-refract')


compile = (mediaType, apiElements, filename) ->
  transactions = []
  errors = []
  warnings = []

  apiElements.annotations.forEach((annotation) ->
    group = if annotation.classes.contains('warning') then warnings else errors
    group.push({
      component: 'apiDescriptionParser'
      code: annotation.code?.toValue()
      message: annotation.toValue()
      location: annotation.sourceMapValue
    })
  )

  # IRON CURTAIN OF THE MINIM SUPPORT
  #
  # Before this line, the code supports API Elements and minim. After this
  # line, the code works with raw JS object representation of the API Elements.
  refract = apiElementsToRefract(apiElements)

  for relevantTransaction in findRelevantTransactions(mediaType, refract, apiElements)
    refractHttpTransaction = relevantTransaction.refract
    exampleNo = relevantTransaction.exampleNo

    refractHttpRequest = child(refractHttpTransaction, {element: 'httpRequest'})
    refractHttpResponse = child(refractHttpTransaction, {element: 'httpResponse'})

    origin = compileOrigin(mediaType, refract, filename, refractHttpTransaction, exampleNo)
    {request, annotations} = compileRequest(refract, refractHttpRequest)

    if request
      transactions.push({
        origin
        pathOrigin: compilePathOrigin(refract, filename, refractHttpTransaction, exampleNo)
        request
        response: compileResponse(refractHttpResponse)
      })

    for error in annotations.errors
      error.origin = clone(origin)
      errors.push(error)
    for warning in annotations.warnings
      warning.origin = clone(origin)
      warnings.push(warning)

  {transactions, errors, warnings}


findRelevantTransactions = (mediaType, refract, apiElements) ->
  relevantTransactions = []

  # This gets deleted once we're fully on minim
  refractTransitions = children(refract, {element: 'transition'})

  apiElements.findRecursive('transition').forEach((transition, transitionNo) ->
    transitionNo = transitionNo.toValue()
    httpTransactions = transition.findRecursive('httpTransaction')

    # This gets deleted once we're fully on minim
    refractTransition = refractTransitions[transitionNo]
    refractHttpTransactions = children(refractTransition, {element: 'httpTransaction'})

    # API Blueprint has a concept of transaction examples and
    # the API Blueprint AST used to expose it. The concept isn't present
    # in API Elements anymore, so we have to detect and backport them.
    if mediaType is 'text/vnd.apiblueprint'
      exampleNumbersPerTransaction = detectExampleNumbersPerTransaction(transition)
    else
      exampleNumbersPerTransaction = httpTransactions.map( -> 1)
    hasMoreExamples = Math.max(exampleNumbersPerTransaction...) > 1

    # Dredd supports only testing of the first request-response pair within
    # each transaction example. So if we're dealing with API Blueprint, we
    # iterate over available transactions and skip those, which are not first
    # within a particular example.
    exampleNo = 0
    httpTransactions.forEach((httpTransaction, httpTransactionNo) ->
      httpTransactionNo = httpTransactionNo.toValue()
      httpTransactionExampleNo = exampleNumbersPerTransaction[httpTransactionNo]

      transactionInfo =
        refract: refractHttpTransactions[httpTransactionNo]
        apiElements: httpTransaction
        exampleNo: if hasMoreExamples then httpTransactionExampleNo else null

      if mediaType is 'text/vnd.apiblueprint'
        if httpTransactionExampleNo isnt exampleNo
          relevantTransactions.push(transactionInfo)
      else
        relevantTransactions.push(transactionInfo)

      exampleNo = httpTransactionExampleNo
    )
  )

  return relevantTransactions


# Detects transaction example numbers for given transition element
#
# Returns an array of numbers, where indexes correspond to HTTP transactions
# within the transition and values represent the example numbers.
detectExampleNumbersPerTransaction = (transition) ->
  tempRefractTransition = apiElementsToRefract(transition)
  tempRefractHttpTransactions = children(tempRefractTransition, {element: 'httpTransaction'})

  detectTransactionExamples(tempRefractTransition)

  return tempRefractHttpTransactions.map((tempRefractHttpTransaction) ->
    return tempRefractHttpTransaction.attributes.example
  )


compileRequest = (parseResult, httpRequest) ->
  messageBody = child(httpRequest, {element: 'asset', 'meta.classes': 'messageBody'})

  {uri, annotations} = compileUri(parseResult, httpRequest)
  if uri
    request = {
      method: content(httpRequest.attributes?.method)
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
    status: content(httpResponse.attributes?.statusCode)
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


compileOrigin = (mediaType, parseResult, filename, httpTransaction, exampleNo) ->
  api = parent(httpTransaction, parseResult, {element: 'category', 'meta.classes': 'api'})
  resourceGroup = parent(httpTransaction, parseResult, {element: 'category', 'meta.classes': 'resourceGroup'})
  resource = parent(httpTransaction, parseResult, {element: 'resource'})
  transition = parent(httpTransaction, parseResult, {element: 'transition'})
  httpRequest = child(httpTransaction, {element: 'httpRequest'})

  {
    filename: filename or ''
    apiName: content(api.meta?.title) or filename or ''
    resourceGroupName: content(resourceGroup?.meta?.title) or ''
    resourceName: content(resource.meta?.title) or content(resource.attributes?.href) or ''
    actionName: content(transition.meta?.title) or content(httpRequest.attributes.method) or ''
    exampleName: compileOriginExampleName(mediaType, parseResult, httpTransaction, exampleNo)
  }


compilePathOrigin = (parseResult, filename, httpTransaction, exampleNo) ->
  api = parent(httpTransaction, parseResult, {element: 'category', 'meta.classes': 'api'})
  resourceGroup = parent(httpTransaction, parseResult, {element: 'category', 'meta.classes': 'resourceGroup'})
  resource = parent(httpTransaction, parseResult, {element: 'resource'})
  transition = parent(httpTransaction, parseResult, {element: 'transition'})
  httpRequest = child(httpTransaction, {element: 'httpRequest'})

  {
    apiName: content(api.meta?.title) or ''
    resourceGroupName: content(resourceGroup?.meta?.title) or ''
    resourceName: content(resource.meta?.title) or content(resource.attributes?.href) or ''
    actionName: content(transition.meta?.title) or content(httpRequest.attributes?.method) or ''
    exampleName: "Example #{exampleNo or 1}"
  }


compileOriginExampleName = (mediaType, parseResult, httpTransaction, exampleNo) ->
  transition = parent(httpTransaction, parseResult, {element: 'transition'})
  httpResponse = child(httpTransaction, {element: 'httpResponse'})

  exampleName = ''

  if mediaType is 'text/vnd.apiblueprint'
    if exampleNo
      exampleName = "Example #{exampleNo}"
  else
    statusCode = content(httpResponse.attributes.statusCode)
    headers = compileHeaders(child(httpResponse, {element: 'httpHeaders'}))
    contentType = caseless(headers).get('content-type')?.value

    segments = []
    segments.push(statusCode) if statusCode
    segments.push(contentType) if contentType
    exampleName = segments.join(' > ')

  return exampleName


module.exports = compile
