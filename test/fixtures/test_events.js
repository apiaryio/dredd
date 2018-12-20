const { afterAll } = require('hooks');

afterAll((done) => {
  process.stdout.write('hooks.afterAll\n');
  done();
});
