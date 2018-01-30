const {afterAll} = require('hooks');

afterAll(function(done) {
  console.log("hooks.afterAll");
  return done();
});
