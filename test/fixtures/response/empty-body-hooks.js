var hooks = require('hooks');


hooks.beforeEachValidation(function (transaction, done) {
  if (transaction.real.body) {
    transaction.fail = 'The response body must be empty';
  }
  done();
});
