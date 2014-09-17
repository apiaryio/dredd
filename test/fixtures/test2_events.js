var hooks = require('hooks');

hooks.beforeAll(function(done) {
  console.log('beforeAll');
  done();
});
