
var hooks = require('hooks');


hooks.before('/honey > GET', function (transaction, done) {
  if (transaction.expected.statusCode[0] == '5') {
    transaction.skip = false;
  }
  done();
});
