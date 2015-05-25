before("Machines > Machines collection > Get Machines", function (transaction) {
  log('error', 'Sandboxed error object');
});

after("Machines > Machines collection > Get Machines", function (transaction) {
  log("using sandboxed hooks.log");
});
