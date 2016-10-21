var hooks = require('hooks');

hooks.after('Resource > Update Resource', function(transaction, done) {
  transaction.test.request.body = '';
  transaction.fail = true;
  done();
});
