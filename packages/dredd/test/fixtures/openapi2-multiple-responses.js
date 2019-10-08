const hooks = require('hooks');

hooks.before('/honey > GET > 500 > application/json', (transaction, done) => {
  transaction.skip = false;
  done();
});
