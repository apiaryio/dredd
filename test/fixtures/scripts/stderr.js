// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
require('./handle-windows-sigint')();


const exit = function () {
  process.stdout.write('exiting\n');
  return process.exit(0);
};

process.on('SIGTERM', exit);
process.on('SIGINT', exit);


process.stderr.write('error output text\n');
setInterval((() => { }), 100);
