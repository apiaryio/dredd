var hooks = require('hooks');

hooks.after('Resource > Update Resource', function(transaction, done) {
  try {

    JSON.parse('💥 boom 💥');

  } catch (err) {
    transaction.test = {};
    return done(new Error('Unexpected exception in hooks'));
  }
  done();
});
