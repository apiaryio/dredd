const {after,afterAll} = require('hooks');

after("Machines > Machines collection > Get Machines", transaction => console.log("*** after"));

afterAll(function(done) {
  console.log("*** afterAll");
  return done();
});
