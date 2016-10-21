var hooks = require('hooks');
var tokenPattern = /([0-9]|[a-f]){24,}/g;

hooks.beforeEach(function(transaction, done) {
  transaction.id = transaction.id.replace(tokenPattern, 'CENSORED');
  transaction.origin.resourceName = transaction.origin.resourceName.replace(tokenPattern, 'CENSORED');
  done();
});

hooks.afterEach(function(transaction, done) {
  transaction.test.request.uri = transaction.test.request.uri.replace(tokenPattern, 'CENSORED');
  done();
});
