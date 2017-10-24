clone = require('clone')
caseless = require('caseless')

detectTransactionExampleNumbers = require('./detect-transaction-example-numbers')
compileUri = require('./compile-uri')
getTransactionName = require('./transaction-name')
getTransactionPath = require('./transaction-path')


compile = (mediaType, apiElements, filename) ->
  apiElements.freeze()

  transactions = []
  errors = apiElements.errors.map(compileAnnotation)
  warnings = apiElements.warnings.map(compileAnnotation)

  for {httpTransactionElement, exampleNo} in findRelevantTransactions(mediaType, apiElements)
    {transaction, annotations} = compileTransaction(mediaType, filename, httpTransactionElement, exampleNo)
    transactions.push(transaction) if transaction
    errors = errors.concat(annotations.errors)
    warnings = warnings.concat(annotations.warnings)

  {mediaType, transactions, errors, warnings}


compileAnnotation = (annotationElement) ->
  {
    component: 'apiDescriptionParser'
    code: annotationElement.code?.toValue()
    message: annotationElement.toValue()
    location: annotationElement.sourceMapValue
  }


findRelevantTransactions = (mediaType, apiElements) ->
  relevantTransactions = []
  apiElements.findRecursive('resource', 'transition').forEach((transitionElement, transitionNo) ->
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
        if httpTransactionExampleNo isnt exampleNo
          relevantTransaction = {httpTransactionElement}
          relevantTransaction.exampleNo = httpTransactionExampleNo if hasMoreExamples
          relevantTransactions.push(relevantTransaction)
        exampleNo = httpTransactionExampleNo
      )
    else
      # All other formats then API Blueprint
      transitionElement.transactions.forEach((httpTransactionElement) ->
        relevantTransactions.push({httpTransactionElement})
      )
  )
  return relevantTransactions


compileTransaction = (mediaType, filename, httpTransactionElement, exampleNo) ->
  origin = compileOrigin(mediaType, filename, httpTransactionElement, exampleNo)
  {request, annotations} = compileRequest(httpTransactionElement.request)

  [].concat(annotations.errors, annotations.warnings).forEach((annotation) ->
    annotation.origin = clone(origin)
  )
  return {transaction: null, annotations} unless request

  name = getTransactionName(origin)
  pathOrigin = compilePathOrigin(filename, httpTransactionElement, exampleNo)
  path = getTransactionPath(pathOrigin)
  response = compileResponse(httpTransactionElement.response)

  transaction = {request, response, origin, name, pathOrigin, path}
  return {transaction, annotations}


compileRequest = (httpRequestElement) ->
  {uri, annotations} = compileUri(httpRequestElement)

  [].concat(annotations.errors, annotations.warnings).forEach((annotation) ->
    annotation.location = (
      httpRequestElement.href?.sourceMapValue or
      httpRequestElement.parents.find('transition').href?.sourceMapValue or
      httpRequestElement.parents.find('resource').href?.sourceMapValue
    )
  )

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
  apiElement = httpTransactionElement.parents.find((element) -> element.classes.contains('api'))
  resourceGroupElement = httpTransactionElement.parents.find((element) -> element.classes.contains('resourceGroup'))
  resourceElement = httpTransactionElement.parents.find('resource')
  transitionElement = httpTransactionElement.parents.find('transition')
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
  apiElement = httpTransactionElement.parents.find((element) -> element.classes.contains('api'))
  resourceGroupElement = httpTransactionElement.parents.find((element) -> element.classes.contains('resourceGroup'))
  resourceElement = httpTransactionElement.parents.find('resource')
  transitionElement = httpTransactionElement.parents.find('transition')
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
