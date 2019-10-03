const hooks = require('hooks');
const fs = require('fs');
const path = require('path');

hooks.beforeEach((transaction, done) => {
  const buffer = fs.readFileSync(path.join(__dirname, '../image.png'));
  transaction.request.body = buffer.toString('base64');
  transaction.request.bodyEncoding = 'base64';
  done();
});
