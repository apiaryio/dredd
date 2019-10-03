const hooks = require('hooks');

hooks.after('Resource > Update Resource', (transaction, done) => {
  transaction.test.request.body = '';
  done();
});
