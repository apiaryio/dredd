var hooks = require('hooks');
var before = hooks.before;
var after = hooks.after;

after(' > Machines collection > Get Machines', function(transaction){
  transaction['fail'] = 'failed in sandboxed hook';
});

before(' > Machines collection > Get Machines', function(transaction){
  transaction['fail'] = 'failed in sandboxed hook';
});