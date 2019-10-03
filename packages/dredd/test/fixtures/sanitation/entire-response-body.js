const hooks = require('hooks');

hooks.after('Resource > Update Resource', (transaction, done) => {
  transaction.test.actual.body = '';
  transaction.test.expected.body = '';
  transaction.test.expected.bodySchema = '';

  transaction.test.message = '';
  delete transaction.test.results.fields.body;
  done();
});
