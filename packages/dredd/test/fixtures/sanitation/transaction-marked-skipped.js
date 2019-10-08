const hooks = require('hooks');

hooks.before('Resource > Update Resource', (transaction, done) => {
  transaction.skip = true;
  done();
});

hooks.after('Resource > Update Resource', (transaction, done) => {
  if (transaction.test && transaction.test.request) {
    transaction.test.request.body = '';
  }
  done();
});
