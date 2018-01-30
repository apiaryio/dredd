/* eslint-disable
    import/no-extraneous-dependencies,
    import/no-unresolved,
    no-console,
    no-unused-vars,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
const { after } = require('hooks');

after('Name API > /name > GET', transaction => console.log('after name'));

after('Greeting API > /greeting > GET', transaction => console.log('after greeting'));

after('Message API > /message > GET', transaction => console.log('after message'));
