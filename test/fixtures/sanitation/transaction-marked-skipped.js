var hooks = require('hooks');

hooks.before('Resource > Update Resource', function(transaction, done) {
  transaction.skip = true;
  done();
});

hooks.after('Resource > Update Resource', function(transaction, done) {
  if (transaction.test && transaction.test.request) {
    transaction.test.request.body = '';
  }
  done();
});
