const hooks = require('hooks');


hooks.beforeAll((transactions) => {
  console.log('hooks.beforeAll', transactions.length);
});
