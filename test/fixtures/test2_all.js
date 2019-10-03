const hooks = require('hooks');

hooks.beforeAll((done) => {
  console.log('*** beforeAll');
  done();
});

hooks.before(
  'Machines > Machines collection > Get Machines',
  (transaction, done) => {
    console.log('*** before');
    done();
  },
);
