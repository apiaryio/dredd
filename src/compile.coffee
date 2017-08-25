clone = require('clone')
caseless = require('caseless')

detectTransactionExampleNumbers = require('./detect-transaction-example-numbers')
compileUri = require('./compile-uri')


compile = (mediaType, apiElements, filename) ->
  transactions = []
  errors = apiElements.errors.map(compileAnnotation)
  warnings = apiElements.warnings.map(compileAnnotation)

  for relevantTransaction in findRelevantTransactions(mediaType, apiElements)
    exampleNo = relevantTransaction.exampleNo

    origin = compileOrigin(mediaType, filename, relevantTransaction.apiElements, exampleNo)
    {request, annotations} = compileRequest(relevantTransaction.apiElements.request)

    if request
      transactions.push({
        origin
        pathOrigin: compilePathOrigin(filename, relevantTransaction.apiElements, exampleNo)
        request
        response: compileResponse(relevantTransaction.apiElements.response)
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


findRelevantTransactions = (mediaType, apiElements) ->
  relevantTransactions = []
  apiElements.findRecursive('transition').forEach((transitionElement, transitionNo) ->
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
      transactionExampleNumbers = detectTransactionExampleNumbers(transitionElement)
      hasMoreExamples = Math.max(transactionExampleNumbers...) > 1

      # Dredd supports only testing of the first request-response pair within
      # each transaction example. We iterate over available transactions and
      # skip those, which are not first within a particular example.
      exampleNo = 0
      transitionElement.transactions.forEach((httpTransactionElement, httpTransactionNo) ->
        httpTransactionExampleNo = transactionExampleNumbers[httpTransactionNo]

        relevantTransaction =
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
          apiElements: httpTransactionElement
        )
      )
  )
  return relevantTransactions


compileRequest = (httpRequestElement) ->
  {uri, annotations} = compileUri(httpRequestElement)
  if uri
    request =
      method: httpRequestElement.method.toValue()
      uri: uri
      headers: compileHeaders(httpRequestElement.headers)
      body: httpRequestElement.messageBody?.toValue() or ''
  else
    request = null
  return {request, annotations}


compileResponse = (httpResponseElement) ->
  response =
    status: httpResponseElement.statusCode.toValue()
    headers: compileHeaders(httpResponseElement.headers)
    body: httpResponseElement.messageBody?.toValue() or ''

  schema = httpResponseElement.messageBodySchema?.toValue()
  response.schema = schema if schema

  return response


compileOrigin = (mediaType, filename, httpTransactionElement, exampleNo) ->
  apiElement = httpTransactionElement.closest('category', 'api')
  resourceGroupElement = httpTransactionElement.closest('category', 'resourceGroup')
  resourceElement = httpTransactionElement.closest('resource')
  transitionElement = httpTransactionElement.closest('transition')
  httpRequestElement = httpTransactionElement.request
  httpResponseElement = httpTransactionElement.response
  {
    filename: filename or ''
    apiName: apiElement.meta.getValue('title') or filename or ''
    resourceGroupName: resourceGroupElement?.meta.getValue('title') or ''
    resourceName: resourceElement.meta.getValue('title') or resourceElement.attributes.getValue('href') or ''
    actionName: transitionElement.meta.getValue('title') or httpRequestElement.attributes.getValue('method') or ''
    exampleName: compileOriginExampleName(mediaType, httpResponseElement, exampleNo)
  }


compileOriginExampleName = (mediaType, httpResponseElement, exampleNo) ->
  exampleName = ''

  if mediaType is 'text/vnd.apiblueprint'
    if exampleNo
      exampleName = "Example #{exampleNo}"
  else
    statusCode = httpResponseElement.statusCode.toValue()
    headers = compileHeaders(httpResponseElement.headers)
    contentType = caseless(headers).get('content-type')?.value

    segments = []
    segments.push(statusCode) if statusCode
    segments.push(contentType) if contentType
    exampleName = segments.join(' > ')

  return exampleName


compilePathOrigin = (filename, httpTransactionElement, exampleNo) ->
  apiElement = httpTransactionElement.closest('category', 'api')
  resourceGroupElement = httpTransactionElement.closest('category', 'resourceGroup')
  resourceElement = httpTransactionElement.closest('resource')
  transitionElement = httpTransactionElement.closest('transition')
  httpRequestElement = httpTransactionElement.request
  {
    apiName: apiElement.meta.getValue('title') or ''
    resourceGroupName: resourceGroupElement?.meta.getValue('title') or ''
    resourceName: resourceElement.meta.getValue('title') or resourceElement.attributes.getValue('href') or ''
    actionName: transitionElement.meta.getValue('title') or httpRequestElement.attributes.getValue('method') or ''
    exampleName: "Example #{exampleNo or 1}"
  }


compileHeaders = (httpHeadersElement) ->
  return {} unless httpHeadersElement
  httpHeadersElement.toValue().reduce((headers, {key, value}) ->
    headers[key] = {value}
    return headers
  , {})


module.exports = compile
