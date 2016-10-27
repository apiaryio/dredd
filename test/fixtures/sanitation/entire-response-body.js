var hooks = require('hooks');

hooks.after('Resource > Update Resource', function(transaction, done) {
  transaction.test.actual.body = '';
  transaction.test.expected.body = '';
  transaction.test.expected.bodySchema = '';

  transaction.test.message = '';
  delete transaction.test.results.body;
  done();
});
