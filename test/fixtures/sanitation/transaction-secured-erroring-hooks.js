var hooks = require('hooks');

hooks.after('Resource > Update Resource', function(transaction, done) {
  try {

    JSON.parse('💥 boom 💥');

  } catch (error) {
    transaction.fail = 'Unexpected exception in hooks';
    transaction.test = {
      start: transaction.test.start,
      end: transaction.test.end,
      duration: transaction.test.duration,
      startedAt: transaction.test.startedAt,
      message: transaction.fail,
    };
  }
  done();
});
