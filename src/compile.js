const clone = require('clone');

const detectTransactionExampleNumbers = require('./detect-transaction-example-numbers');
const compileUri = require('./compile-uri');
const getTransactionName = require('./transaction-name');
const getTransactionPath = require('./transaction-path');


const compile = function(mediaType, apiElements, filename) {
  apiElements.freeze();

  const transactions = [];
  let annotations = apiElements.annotations.map(compileAnnotation);

  for (let {httpTransactionElement, exampleNo} of findRelevantTransactions(mediaType, apiElements)) {
    const result = compileTransaction(mediaType, filename, httpTransactionElement, exampleNo);
    if (result.transaction) { transactions.push(result.transaction); }
    annotations = annotations.concat(result.annotations);
  }

  return {mediaType, transactions, annotations};
};


var compileAnnotation = annotationElement =>
  ({
    type: annotationElement.classes.getValue(0),
    component: 'apiDescriptionParser',
    message: annotationElement.toValue(),
    location: annotationElement.sourceMapValue || [[0, 1]]
  })
;


var findRelevantTransactions = function(mediaType, apiElements) {
  const relevantTransactions = [];
  apiElements.findRecursive('resource', 'transition').forEach(function(transitionElement, transitionNo) {
    if (mediaType === 'text/vnd.apiblueprint') {
      // API Blueprint has a concept of transaction examples and
      // the API Blueprint AST used to expose it. The concept isn't present
      // in API Elements anymore, so we have to detect and backport them, because
      // the example numbers are used in the transaction names for hooks.
      //
      // This is very specific to API Blueprint and to backwards compatibility
      // of Dredd. There's a plan to migrate to so-called "transaction paths"
      // in the future (apiaryio/dredd#227), which won't use the concept
      // of transaction examples anymore.
      const transactionExampleNumbers = detectTransactionExampleNumbers(transitionElement);
      const hasMoreExamples = Math.max(...Array.from(transactionExampleNumbers || [])) > 1;

      // Dredd supports only testing of the first request-response pair within
      // each transaction example. We iterate over available transactions and
      // skip those, which are not first within a particular example.
      let exampleNo = 0;
      return transitionElement.transactions.forEach(function(httpTransactionElement, httpTransactionNo) {
        const httpTransactionExampleNo = transactionExampleNumbers[httpTransactionNo];
        if (httpTransactionExampleNo !== exampleNo) {
          const relevantTransaction = {httpTransactionElement};
          if (hasMoreExamples) { relevantTransaction.exampleNo = httpTransactionExampleNo; }
          relevantTransactions.push(relevantTransaction);
        }
        return exampleNo = httpTransactionExampleNo;
      });
    } else {
      // All other formats then API Blueprint
      return transitionElement.transactions.forEach(httpTransactionElement => relevantTransactions.push({httpTransactionElement}));
    }
  });
  return relevantTransactions;
};


var compileTransaction = function(mediaType, filename, httpTransactionElement, exampleNo) {
  const origin = compileOrigin(mediaType, filename, httpTransactionElement, exampleNo);
  const {request, annotations} = compileRequest(httpTransactionElement.request);

  annotations.forEach(annotation => annotation.origin = clone(origin));
  if (!request) { return {transaction: null, annotations}; }

  const name = getTransactionName(origin);
  const pathOrigin = compilePathOrigin(filename, httpTransactionElement, exampleNo);
  const path = getTransactionPath(pathOrigin);
  const response = compileResponse(httpTransactionElement.response);

  const transaction = {request, response, origin, name, pathOrigin, path};
  return {transaction, annotations};
};


var compileRequest = function(httpRequestElement) {
  let request;
  const {uri, annotations} = compileUri(httpRequestElement);

  annotations.forEach(annotation =>
    annotation.location = (
      (httpRequestElement.href != null ? httpRequestElement.href.sourceMapValue : undefined) ||
      __guard__(httpRequestElement.parents.find('transition').href, x => x.sourceMapValue) ||
      __guard__(httpRequestElement.parents.find('resource').href, x1 => x1.sourceMapValue)
    )
  );

  if (uri) {
    request = {
      method: httpRequestElement.method.toValue(),
      uri,
      headers: compileHeaders(httpRequestElement.headers),
      body: (httpRequestElement.messageBody != null ? httpRequestElement.messageBody.toValue() : undefined) || ''
    };
  } else {
    request = null;
  }

  return {request, annotations};
};


var compileResponse = function(httpResponseElement) {
  const response = {
    status: (httpResponseElement.statusCode != null ? httpResponseElement.statusCode.toValue() : undefined) || '200',
    headers: compileHeaders(httpResponseElement.headers)
  };

  const body = httpResponseElement.messageBody != null ? httpResponseElement.messageBody.toValue() : undefined;
  if (body) { response.body = body; }

  const schema = httpResponseElement.messageBodySchema != null ? httpResponseElement.messageBodySchema.toValue() : undefined;
  if (schema) { response.schema = schema; }

  return response;
};


var compileOrigin = function(mediaType, filename, httpTransactionElement, exampleNo) {
  const apiElement = httpTransactionElement.parents.find(element => element.classes.contains('api'));
  const resourceGroupElement = httpTransactionElement.parents.find(element => element.classes.contains('resourceGroup'));
  const resourceElement = httpTransactionElement.parents.find('resource');
  const transitionElement = httpTransactionElement.parents.find('transition');
  const httpRequestElement = httpTransactionElement.request;
  const httpResponseElement = httpTransactionElement.response;
  return {
    filename: filename || '',
    apiName: apiElement.meta.getValue('title') || filename || '',
    resourceGroupName: (resourceGroupElement != null ? resourceGroupElement.meta.getValue('title') : undefined) || '',
    resourceName: resourceElement.meta.getValue('title') || resourceElement.attributes.getValue('href') || '',
    actionName: transitionElement.meta.getValue('title') || httpRequestElement.attributes.getValue('method') || '',
    exampleName: compileOriginExampleName(mediaType, httpResponseElement, exampleNo)
  };
};


var compileOriginExampleName = function(mediaType, httpResponseElement, exampleNo) {
  let exampleName = '';

  if (mediaType === 'text/vnd.apiblueprint') {
    if (exampleNo) {
      exampleName = `Example ${exampleNo}`;
    }
  } else {
    const statusCode = (httpResponseElement.statusCode != null ? httpResponseElement.statusCode.toValue() : undefined) || '200';
    const headers = compileHeaders(httpResponseElement.headers);

    const contentType = headers
      .filter(header => header.name.toLowerCase() === 'content-type')
      .map(header => header.value)[0];

    const segments = [];
    if (statusCode) { segments.push(statusCode); }
    if (contentType) { segments.push(contentType); }
    exampleName = segments.join(' > ');
  }

  return exampleName;
};


var compilePathOrigin = function(filename, httpTransactionElement, exampleNo) {
  const apiElement = httpTransactionElement.parents.find(element => element.classes.contains('api'));
  const resourceGroupElement = httpTransactionElement.parents.find(element => element.classes.contains('resourceGroup'));
  const resourceElement = httpTransactionElement.parents.find('resource');
  const transitionElement = httpTransactionElement.parents.find('transition');
  const httpRequestElement = httpTransactionElement.request;
  return {
    apiName: apiElement.meta.getValue('title') || '',
    resourceGroupName: (resourceGroupElement != null ? resourceGroupElement.meta.getValue('title') : undefined) || '',
    resourceName: resourceElement.meta.getValue('title') || resourceElement.attributes.getValue('href') || '',
    actionName: transitionElement.meta.getValue('title') || httpRequestElement.attributes.getValue('method') || '',
    exampleName: `Example ${exampleNo || 1}`
  };
};


var compileHeaders = function(httpHeadersElement) {
  if (!httpHeadersElement) { return []; }
  return httpHeadersElement.toValue().map(({key, value}) => ({name: key, value}));
};


module.exports = compile;

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}