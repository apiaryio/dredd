const caseless = require('caseless');
const hooks = require('hooks');

hooks.after('Resource > Update Resource', (transaction, done) => {
  const deleteSensitiveHeader = (headerName, headers) => {
    const name = caseless(headers).has(headerName);
    delete headers[name];
    return headers;
  };

  // Remove sensitive data from the Dredd transaction
  transaction.test.actual.headers = deleteSensitiveHeader('authorization', transaction.test.actual.headers);
  transaction.test.expected.headers = deleteSensitiveHeader('authorization', transaction.test.expected.headers);

  // Remove sensitive data from the Gavel validation result
  const headersResult = transaction.test.results.fields.headers;
  headersResult.errors = headersResult.errors.filter(error => error.location.pointer.toLowerCase() !== '/authorization');
  headersResult.values.expected = deleteSensitiveHeader('authorization', headersResult.values.expected);

  transaction.test.message = '';
  done();
});
