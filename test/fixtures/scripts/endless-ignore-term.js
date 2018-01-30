/* eslint-disable
    no-console,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
require('./handle-windows-sigint')();


const ignore = () => console.log('ignoring termination');

process.on('SIGTERM', ignore);
process.on('SIGINT', ignore);


setInterval((() => { }), 1000);
