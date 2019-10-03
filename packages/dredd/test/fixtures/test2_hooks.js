const hooks = require('hooks');

hooks.before(
  'Machines > Machines collection > Get Machines',
  (transaction, done) => {
    transaction.request.headers.header = '123232323';
    console.log('before');
    done();
  },
);
