var hooks;

hooks = require('hooks');

hooks.beforeAll(function(done) {
  console.log('*** beforeAll');
  done();
});

hooks.before('Machines > Machines collection > Get Machines', function(transaction, done) {
  console.log('*** before');
  return done();
});
