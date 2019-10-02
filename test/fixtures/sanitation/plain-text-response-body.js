const hooks = require('hooks');

const tokenPattern = /([0-9]|[a-f]){24,}/g;

hooks.after('Resource > Update Resource', (transaction, done) => {
  const replaceToken = body => body.replace(tokenPattern, '--- CENSORED ---');

  // Remove sensitive data from Dredd transaction
  transaction.test.actual.body = replaceToken(transaction.test.actual.body);
  transaction.test.expected.body = replaceToken(transaction.test.expected.body);

  // Remove sensitive data from the Gavel validation result
  const bodyResult = transaction.test.results.fields.body;
  bodyResult.values.expected = replaceToken(bodyResult.values.expected);
  bodyResult.values.actual = replaceToken(bodyResult.values.actual);

  done();
});
