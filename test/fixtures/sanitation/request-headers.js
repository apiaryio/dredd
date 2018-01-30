const caseless = require('caseless');
const hooks = require('hooks');

hooks.after('Resource > Update Resource', (transaction, done) => {
  const headers = transaction.test.request.headers;
  const name = caseless(headers).has('Authorization');
  delete headers[name];
  transaction.test.request.headers = headers;
  done();
});
