var hooks = require('hooks');
var assert = require('chai').assert;
var tokenPattern = /([0-9]|[a-f]){24,}/g;

hooks.afterEach(function(transaction, done) {
  JSON.stringify(transaction.test, function(key, value) {
    if (typeof value === 'string') {
      assert.notMatch(key, tokenPattern); // if it makes sense to check also keys...
      assert.notMatch(value, tokenPattern);
    }
    return value;
  });
  done();
});
