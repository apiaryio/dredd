const hooks = require('hooks');

hooks.beforeAll((done) => {
  process.stdout.write('hooks.beforeAll\n');
  done();
});
