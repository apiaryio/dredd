const hooks = require('hooks');

hooks.beforeEachValidation((transaction, done) => {
  transaction.real.body = '';
  done();
});
