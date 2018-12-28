const hooks = require('hooks');


hooks.afterAll((transactions) => {
  console.log('hooks.afterAll', transactions.length);
});
