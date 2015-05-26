var hooks, log;

hooks = require('hooks');

hooks.beforeAll(function(done) {
  hooks.log('*** beforeAll');
  done();
});

hooks.before('Machines > Machines collection > Get Machines', function(transaction, done) {
  hooks.log('*** before');
  return done();
});
