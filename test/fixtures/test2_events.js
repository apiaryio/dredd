var events;

events = require('dredd-events');

events.beforeAll(function(done) {
  console.log('beforeAll');
  done();
});
