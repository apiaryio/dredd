const hooks = require('hooks');

hooks.after('Resource > Update Resource', (transaction, done) => {
  JSON.parse('💥 boom 💥');
  done();
});
