var hooks = require('hooks');
var tokenPattern = /([0-9]|[a-f]){24,}/g;

hooks.after('Resource > Update Resource', function(transaction, done) {
  var body;

  body = transaction.test.actual.body;
  transaction.test.actual.body = body.replace(tokenPattern, '--- CENSORED ---');

  body = transaction.test.expected.body;
  transaction.test.expected.body = body.replace(tokenPattern, '--- CENSORED ---');

  // sanitation of diff in the patch format
  delete transaction.test.results.body.results.rawData;
  done();
});
