const hooks = require('hooks');
const fs = require('fs');
const path = require('path');

hooks.beforeEachValidation((transaction, done) => {
  const bytes = fs.readFileSync(path.join(__dirname, '../image.png'));
  transaction.expected.body = bytes.toString('base64');
  done();
});
