const hooks = require('hooks');

hooks.beforeAll((done) => {
  console.log('hooks.beforeAll');
  done();
});
