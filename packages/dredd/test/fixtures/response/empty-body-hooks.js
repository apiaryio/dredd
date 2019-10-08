const hooks = require('hooks');

hooks.beforeEachValidation((transaction, done) => {
  if (transaction.real.body) {
    transaction.fail = 'The response body must be empty';
  }
  done();
});
