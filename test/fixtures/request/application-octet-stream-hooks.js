const hooks = require('hooks');

hooks.beforeEach((transaction, done) => {
  transaction.request.body = Buffer.from([0xFF, 0xEF, 0xBF, 0xBE]).toString('base64');
  transaction.request.bodyEncoding = 'base64';
  done();
});
