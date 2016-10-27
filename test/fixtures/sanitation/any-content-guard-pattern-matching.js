var hooks = require('hooks');
var assert = require('chai').assert;
var tokenPattern = /([0-9]|[a-f]){24,}/g;

hooks.beforeEach(function(transaction, done) {
  transaction.id = transaction.id.replace(tokenPattern, 'CENSORED');
  transaction.origin.resourceName = transaction.origin.resourceName.replace(tokenPattern, 'CENSORED');
  done();
});

hooks.afterEach(function(transaction, done) {
  try {

    JSON.stringify(transaction.test, function(key, value) {
      if (typeof value === 'string') {
        assert.notMatch(value, tokenPattern);
      }
      return value;
    });

  } catch (error) {
    transaction.fail = 'Sensitive data would be sent to Dredd reporter';
    transaction.test = {
      start: transaction.test.start,
      end: transaction.test.end,
      duration: transaction.test.duration,
      startedAt: transaction.test.startedAt,
      message: transaction.fail,
    };
  }
  done();
});
