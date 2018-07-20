const hooks = require('hooks');
const fs = require('fs');
const path = require('path');
const { assert } = require('chai');

hooks.beforeEachValidation((transaction, done) => {
  const buffer = fs.readFileSync(path.join(__dirname, '../image.png'));
  assert.equal(transaction.real.body, buffer.toString());
  done();
});
