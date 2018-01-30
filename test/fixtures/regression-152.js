const hooks = require('hooks');

// New hooks helper function
hooks.beforeEach = hookFn =>
  hooks.beforeAll(function(done) {
    const object = hooks.transactions || {};
    for (let transactionKey in object) {
      const transaction = object[transactionKey];
      if (hooks.beforeHooks[transaction.name] == null) { hooks.beforeHooks[transaction.name] = []; }
      hooks.beforeHooks[transaction.name].unshift(hookFn);
    }
    return done();
  })
;

hooks.beforeEach(function(transaction) {
  // add query parameter to each transaction here
  const paramToAdd = "api-key=23456";
  if (transaction.fullPath.indexOf('?') > -1) {
    return transaction.fullPath += `&${paramToAdd}`;
  } else {
    return transaction.fullPath += `?${paramToAdd}`;
  }
});
