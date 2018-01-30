/* eslint-disable
    import/no-extraneous-dependencies,
    import/no-unresolved,
    no-console,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
const { afterAll } = require('hooks');

afterAll((done) => {
  console.log('hooks.afterAll');
  return done();
});
