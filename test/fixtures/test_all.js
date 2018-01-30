/* eslint-disable
    import/no-extraneous-dependencies,
    import/no-unresolved,
    no-console,
    no-unused-vars,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
const { after, afterAll } = require('hooks');

after('Machines > Machines collection > Get Machines', transaction => console.log('*** after'));

afterAll((done) => {
  console.log('*** afterAll');
  return done();
});
