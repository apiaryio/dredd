const hooks = require('hooks');

hooks.beforeAll((done) => {
  process.stdout.write('*** beforeAll\n');
  done();
});

hooks.before('Machines > Machines collection > Get Machines', (transaction, done) => {
  process.stdout.write('*** before\n');
  done();
});
