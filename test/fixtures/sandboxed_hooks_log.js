before("Machines > Machines collection > Get Machines", function (transaction) {
  log('shall not print, but be present in logs');
});

after("Machines > Machines collection > Get Machines", function (transaction) {
  log("using sandboxed hooks.log");
});
