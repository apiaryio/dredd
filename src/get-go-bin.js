const childProcess = require('child_process');
const path = require('path');

// Docs:
// - https://golang.org/doc/code.html#GOPATH
// - https://golang.org/cmd/go/#hdr-GOPATH_environment_variable
module.exports = function getGoBin(callback) {
  const goBin = process.env.GOBIN;
  if (goBin) {
    process.nextTick(() => callback(null, goBin));
  } else if (process.env.GOPATH) {
    process.nextTick(() => callback(null, path.join(process.env.GOPATH, 'bin')));
  } else {
    childProcess.exec('go env GOPATH', (err, stdout) => {
      if (err) { return callback(err); }
      callback(null, path.join(stdout.trim(), 'bin'));
    });
  }
};
