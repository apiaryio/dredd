var hooks = require('hooks');

hooks.beforeAll(function(done) {
  hooks.log('hooks.beforeAll');
  done();
});
