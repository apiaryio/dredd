const { afterAll } = require('hooks');

afterAll((done) => {
  console.log('hooks.afterAll');
  done();
});
