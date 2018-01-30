/* eslint-disable
    import/no-extraneous-dependencies,
    import/no-unresolved,
    no-unused-vars,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
const { before, after, log } = require('hooks');

before('Machines > Machines collection > Get Machines', (transaction) => {
  log({ err: 'Error object!' });
  return log(true);
});

after('Machines > Machines collection > Get Machines', transaction => log('using hooks.log to debug'));
