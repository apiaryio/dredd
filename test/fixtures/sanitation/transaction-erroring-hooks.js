var hooks = require('hooks');

hooks.after('Resource > Update Resource', function(transaction, done) {
  JSON.parse('💥 boom 💥');
  done();
});
