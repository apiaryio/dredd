const hooks = require('hooks');

hooks.after('Resource > Update Resource', (transaction, done) => {
  const body = JSON.parse(transaction.test.request.body);
  delete body.token;
  transaction.test.request.body = JSON.stringify(body);
  done();
});
