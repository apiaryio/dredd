const hooks = require('hooks');

function logTransactionName(transaction, done) {
  hooks.log(transaction.name);
  done();
}

hooks.before('/honey > GET > 400 > application/json', logTransactionName);
hooks.before('/honey > GET > 500 > application/json', logTransactionName);
hooks.before('/honey > GET > 200 > application/json', logTransactionName);
