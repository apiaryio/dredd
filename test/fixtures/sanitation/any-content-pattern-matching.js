var hooks = require('hooks');
var tokenPattern = /([0-9]|[a-f]){24,}/g;

hooks.beforeEach(function(transaction, done) {
  transaction.id = transaction.id.replace(tokenPattern, 'CENSORED');
  transaction.origin.resourceName = transaction.origin.resourceName.replace(tokenPattern, 'CENSORED');
  done();
});

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
