const hooks = require('hooks');

hooks.beforeEach((transaction, done) => {
  transaction.request.body = Buffer.from([0xff, 0xef, 0xbf, 0xbe]).toString(
    'base64',
  );
  transaction.request.bodyEncoding = 'base64';
  done();
});
