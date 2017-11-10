var hooks = require('hooks');

hooks.before('/honey > GET > 500 > application/json', function (transaction, done) {
  transaction.skip = false;
  done();
});

hooks.before('/honey > GET > 500 > application/xml', function (transaction, done) {
  transaction.skip = false;
  done();
});
