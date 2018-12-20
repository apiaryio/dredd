const assert = require('chai').assert;
const hooks = require('hooks');

const tokenPattern = /([0-9]|[a-f]){24,}/g;

hooks.beforeEach((transaction, done) => {
  transaction.id = transaction.id.replace(tokenPattern, 'CENSORED');
  transaction.origin.resourceName = transaction.origin.resourceName.replace(tokenPattern, 'CENSORED');
  done();
});

hooks.afterEach((transaction, done) => {
  try {
    JSON.stringify(transaction.test, (key, value) => {
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
