var hooks = require('hooks');

hooks.beforeAll(function(done) {
  console.log('hooks.beforeAll');
  done();
});
