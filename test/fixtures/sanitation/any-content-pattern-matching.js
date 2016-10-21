var hooks = require('hooks');
var tokenPattern = /([0-9]|[a-f]){24,}/g;

hooks.afterEach(function(transaction, done) {
  var test = JSON.stringify(transaction.test, function(key, value) {
    if (value.replace) {
      return value.replace(tokenPattern, 'CENSORED');
    }
    return value;
  });
  transaction.test = JSON.parse(test);
  done();
});
