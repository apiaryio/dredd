const hooks = require('hooks');

const before = hooks.before;
const after = hooks.after;

after(' > Machines collection > Get Machines', (transaction) => {
  transaction.fail = 'failed in sandboxed hook';
});

before(' > Machines collection > Get Machines', (transaction) => {
  transaction.fail = 'failed in sandboxed hook';
});
