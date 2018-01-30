/* eslint-disable
    guard-for-in,
    import/no-extraneous-dependencies,
    import/no-unresolved,
    no-return-assign,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
const hooks = require('hooks');

// New hooks helper function
hooks.beforeEach = hookFn =>
  hooks.beforeAll((done) => {
    const object = hooks.transactions || {};
    for (const transactionKey in object) {
      const transaction = object[transactionKey];
      if (hooks.beforeHooks[transaction.name] == null) { hooks.beforeHooks[transaction.name] = []; }
      hooks.beforeHooks[transaction.name].unshift(hookFn);
    }
    return done();
  })
;

hooks.beforeEach((transaction) => {
  // add query parameter to each transaction here
  const paramToAdd = 'api-key=23456';
  if (transaction.fullPath.indexOf('?') > -1) {
    return transaction.fullPath += `&${paramToAdd}`;
  }
  return transaction.fullPath += `?${paramToAdd}`;
});
