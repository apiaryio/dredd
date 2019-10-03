const hooks = require('hooks');

const tokenPattern = /([0-9]|[a-f]){24,}/g;

hooks.beforeEach((transaction, done) => {
  transaction.id = transaction.id.replace(tokenPattern, 'CENSORED');
  transaction.origin.resourceName = transaction.origin.resourceName.replace(tokenPattern, 'CENSORED');
  done();
});

hooks.afterEach((transaction, done) => {
  transaction.test.request.uri = transaction.test.request.uri.replace(tokenPattern, 'CENSORED');
  done();
});
