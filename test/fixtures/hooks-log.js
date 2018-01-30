const {before, after, log} = require('hooks');

before("Machines > Machines collection > Get Machines", function(transaction) {
  log({err: 'Error object!'});
  return log(true);
});

after("Machines > Machines collection > Get Machines", transaction => log("using hooks.log to debug"));
