clone = require('clone')
caseless = require('caseless')

{child, children, parent, content} = require('./refract')
detectTransactionExamples = require('./detect-transaction-examples')
apiElementsToRefract = require('./api-elements-to-refract')
compileUri = require('./compile-uri')


compile = (mediaType, apiElements, filename) ->
  transactions = []
  errors = apiElements.errors.map(compileAnnotation)
  warnings = apiElements.warnings.map(compileAnnotation)

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


compileAnnotation = (annotationElement) ->
  {
    component: 'apiDescriptionParser'
    code: annotationElement.code?.toValue()
    message: annotationElement.toValue()
    location: annotationElement.sourceMapValue
  }


findRelevantTransactions = (mediaType, refract, apiElements) ->
  relevantTransactions = []

  # This gets deleted once we're fully on minim
  refractTransitions = children(refract, {element: 'transition'})

  apiElements.findRecursive('transition').forEach((transitionElement, transitionNo) ->
    # This gets deleted once we're fully on minim
    refractTransition = refractTransitions[transitionNo]
    refractHttpTransactions = children(refractTransition, {element: 'httpTransaction'})

    if mediaType is 'text/vnd.apiblueprint'
      # API Blueprint has a concept of transaction examples and
      # the API Blueprint AST used to expose it. The concept isn't present
      # in API Elements anymore, so we have to detect and backport them, because
      # the example numbers are used in the transaction names for hooks.
      #
      # This is very specific to API Blueprint and to backwards compatibility
      # of Dredd. There's a plan to migrate to so-called "transaction paths"
      # in the future (apiaryio/dredd#227), which won't use the concept
      # of transaction examples anymore.
      exampleNumbersPerTransaction = detectExampleNumbersPerTransaction(transitionElement)
      hasMoreExamples = Math.max(exampleNumbersPerTransaction...) > 1

      # Dredd supports only testing of the first request-response pair within
      # each transaction example. We iterate over available transactions and
      # skip those, which are not first within a particular example.
      exampleNo = 0
      transitionElement.transactions.forEach((httpTransactionElement, httpTransactionNo) ->
        httpTransactionExampleNo = exampleNumbersPerTransaction[httpTransactionNo]

        relevantTransaction =
          refract: refractHttpTransactions[httpTransactionNo]
          apiElements: httpTransactionElement
          exampleNo: if hasMoreExamples then httpTransactionExampleNo else null

        if httpTransactionExampleNo isnt exampleNo
          relevantTransactions.push(relevantTransaction)

        exampleNo = httpTransactionExampleNo
      )
    else
      # All other formats then API Blueprint
      transitionElement.transactions.forEach((httpTransactionElement, httpTransactionNo) ->
        relevantTransactions.push(
          refract: refractHttpTransactions[httpTransactionNo]
          apiElements: httpTransactionElement
        )
      )
  )

  return relevantTransactions


# Detects transaction example numbers for given transition element
#
# Returns an array of numbers, where indexes correspond to HTTP transactions
# within the transition and values represent the example numbers.
detectExampleNumbersPerTransaction = (transitionElement) ->
  tempRefractTransition = apiElementsToRefract(transitionElement)
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
