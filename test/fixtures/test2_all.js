var events;
var hooks;

events = require('dredd-events');
hooks = require('hooks');

events.beforeAll(function(done) {
  console.log('*** beforeAll');
  done();
});

hooks.before('Machines > Machines collection > Get Machines', function(transaction, done) {
  console.log('*** before');
  return done();
});
