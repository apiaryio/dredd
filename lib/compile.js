const detectTransactionExampleNumbers = require('./detect-transaction-example-numbers');
const compileUri = require('./compile-uri');
const getTransactionName = require('./transaction-name');
const getTransactionPath = require('./transaction-path');

function findRelevantTransactions(mediaType, apiElements) {
  const relevantTransactions = [];
  apiElements.findRecursive('resource', 'transition').forEach((transitionElement) => {
    if (mediaType === 'text/vnd.apiblueprint') {
      // API Blueprint has a concept of transaction examples and
      // the API Blueprint AST used to expose it. The concept isn't present
      // in API Elements anymore, so we have to detect and backport them, because
      // the example numbers are used in the transaction names for hooks.
      //
      // This is very specific to API Blueprint and to backwards compatibility
      // of Dredd. There's a plan to migrate to so-called "transaction paths"
      // in the future (https://github.com/apiaryio/dredd/issues/227), which
      // won't use the concept of transaction examples anymore.
      const transactionExampleNumbers = detectTransactionExampleNumbers(transitionElement);
      const hasMoreExamples = Math.max(...Array.from(transactionExampleNumbers || [])) > 1;

      // Dredd supports only testing of the first request-response pair within
      // each transaction example. We iterate over available transactions and
      // skip those, which are not first within a particular example.
      let exampleNo = 0;
      transitionElement.transactions.forEach((httpTransactionElement, httpTransactionNo) => {
        const httpTransactionExampleNo = transactionExampleNumbers[httpTransactionNo];
        if (httpTransactionExampleNo !== exampleNo) {
          const relevantTransaction = { httpTransactionElement };
          if (hasMoreExamples) { relevantTransaction.exampleNo = httpTransactionExampleNo; }
          relevantTransactions.push(relevantTransaction);
        }
        exampleNo = httpTransactionExampleNo;
        return exampleNo;
      });
    } else {
      // All other formats then API Blueprint
      transitionElement.transactions.forEach((httpTransactionElement) => {
        relevantTransactions.push({ httpTransactionElement });
      });
    }
  });
  return relevantTransactions;
}

function compileHeaders(httpHeadersElement) {
  if (!httpHeadersElement) { return []; }
  return httpHeadersElement.toValue().map(({ key, value }) => ({ name: key, value }));
}

function compileOriginExampleName(mediaType, httpResponseElement, exampleNo) {
  let exampleName = '';

  if (mediaType === 'text/vnd.apiblueprint') {
    if (exampleNo) {
      exampleName = `Example ${exampleNo}`;
    }
  } else {
    const statusCode = (httpResponseElement.statusCode ? httpResponseElement.statusCode.toValue() : undefined) || '200';
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
}

function compileOrigin(mediaType, filename, httpTransactionElement, exampleNo) {
  const apiElement = httpTransactionElement.parents.find(element => element.classes.contains('api'));
  const resourceGroupElement = httpTransactionElement.parents.find(element => element.classes.contains('resourceGroup'));
  const resourceElement = httpTransactionElement.parents.find('resource');
  const transitionElement = httpTransactionElement.parents.find('transition');
  const httpRequestElement = httpTransactionElement.request;
  const httpResponseElement = httpTransactionElement.response;
  return {
    filename: filename || '',
    apiName: apiElement.meta.getValue('title') || filename || '',
    resourceGroupName: (resourceGroupElement ? resourceGroupElement.meta.getValue('title') : undefined) || '',
    resourceName: resourceElement.meta.getValue('title') || resourceElement.attributes.getValue('href') || '',
    actionName: transitionElement.meta.getValue('title') || httpRequestElement.attributes.getValue('method') || '',
    exampleName: compileOriginExampleName(mediaType, httpResponseElement, exampleNo),
  };
}

function hasMultipartBody(headers) {
  return !!headers.filter(({ name, value }) => name.toLowerCase() === 'content-type'
    && value.toLowerCase().includes('multipart')).length;
}

function compileBody(messageBodyElement, isMultipart) {
  if (!messageBodyElement) { return ''; }

  const body = messageBodyElement.toValue() || '';
  if (!isMultipart) { return body; }

  // Fixing manually written 'multipart/form-data' bodies (API Blueprint
  // issue: https://github.com/apiaryio/api-blueprint/issues/401)
  return body.replace(/\r?\n/g, '\r\n');
}

function compileRequest(httpRequestElement) {
  let request;
  const { uri, annotations } = compileUri(httpRequestElement);

  annotations.forEach((annotation) => {
    /* eslint-disable no-param-reassign */
    annotation.location = (
      (httpRequestElement.href ? httpRequestElement.href.sourceMapValue : undefined)
      || (httpRequestElement.parents.find('transition').href ? httpRequestElement.parents.find('transition').href.sourceMapValue : undefined)
      || (httpRequestElement.parents.find('resource').href ? httpRequestElement.parents.find('resource').href.sourceMapValue : undefined)
    );
    /* eslint-enable */
  });

  if (uri) {
    const headers = compileHeaders(httpRequestElement.headers);
    request = {
      method: httpRequestElement.method.toValue(),
      uri,
      headers,
      body: compileBody(httpRequestElement.messageBody, hasMultipartBody(headers)),
    };
  } else {
    request = null;
  }

  return { request, annotations };
}

function compileResponse(httpResponseElement) {
  const status = (httpResponseElement.statusCode ? httpResponseElement.statusCode.toValue() : undefined) || '200';
  const headers = compileHeaders(httpResponseElement.headers);
  const response = { status, headers };

  const body = compileBody(httpResponseElement.messageBody, hasMultipartBody(headers));
  if (body) { response.body = body; }

  const schema = httpResponseElement.messageBodySchema
    ? httpResponseElement.messageBodySchema.toValue() : undefined;
  if (schema) { response.schema = schema; }

  return response;
}

function compilePathOrigin(filename, httpTransactionElement, exampleNo) {
  const apiElement = httpTransactionElement.parents.find(element => element.classes.contains('api'));
  const resourceGroupElement = httpTransactionElement.parents.find(element => element.classes.contains('resourceGroup'));
  const resourceElement = httpTransactionElement.parents.find('resource');
  const transitionElement = httpTransactionElement.parents.find('transition');
  const httpRequestElement = httpTransactionElement.request;
  return {
    apiName: apiElement.meta.getValue('title') || '',
    resourceGroupName: (resourceGroupElement ? resourceGroupElement.meta.getValue('title') : undefined) || '',
    resourceName: resourceElement.meta.getValue('title') || resourceElement.attributes.getValue('href') || '',
    actionName: transitionElement.meta.getValue('title') || httpRequestElement.attributes.getValue('method') || '',
    exampleName: `Example ${exampleNo || 1}`,
  };
}

function compileTransaction(mediaType, filename, httpTransactionElement, exampleNo) {
  const origin = compileOrigin(mediaType, filename, httpTransactionElement, exampleNo);
  const { request, annotations } = compileRequest(httpTransactionElement.request);

  annotations.forEach((annotation) => { annotation.origin = Object.assign({}, origin); }); // eslint-disable-line

  if (!request) { return { transaction: null, annotations }; }

  const name = getTransactionName(origin);
  const pathOrigin = compilePathOrigin(filename, httpTransactionElement, exampleNo);
  const path = getTransactionPath(pathOrigin);
  const response = compileResponse(httpTransactionElement.response);

  const transaction = {
    request, response, origin, name, pathOrigin, path,
  };
  return { transaction, annotations };
}

function compileAnnotation(annotationElement) {
  return {
    type: annotationElement.classes.getValue(0),
    component: 'apiDescriptionParser',
    message: annotationElement.toValue(),
    location: annotationElement.sourceMapValue || [[0, 1]],
  };
}

function compile(mediaType, apiElements, filename) {
  apiElements.freeze();

  const transactions = [];
  let annotations = apiElements.annotations.map(compileAnnotation);

  findRelevantTransactions(mediaType, apiElements)
    .forEach(({ httpTransactionElement, exampleNo }) => {
      const result = compileTransaction(mediaType, filename, httpTransactionElement, exampleNo);
      if (result.transaction) { transactions.push(result.transaction); }
      annotations = annotations.concat(result.annotations);
    });

  return { mediaType, transactions, annotations };
}


// only for the purpose of unit tests
compile._compileBody = compileBody;
compile._hasMultipartBody = hasMultipartBody;


module.exports = compile;
