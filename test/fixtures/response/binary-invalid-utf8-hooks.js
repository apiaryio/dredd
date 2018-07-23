const hooks = require('hooks');
const { assert } = require('chai');

hooks.beforeEachValidation((transaction, done) => {
  assert.equal(typeof transaction.real.body, 'string');
  assert.equal(transaction.real.body, Buffer.from([0xFF, 0xEF, 0xBF, 0xBE]).toString());
  done();
});
