// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
const path = require('path');
const childProcess = require('child_process');


// Docs:
// - https://golang.org/doc/code.html#GOPATH
// - https://golang.org/cmd/go/#hdr-GOPATH_environment_variable
const getGoBin = function(callback) {
  const goBin = process.env.GOBIN;
  if (goBin) {
    return process.nextTick( () => callback(null, goBin));
  } else {
    if (process.env.GOPATH) {
      return process.nextTick( () => callback(null, path.join(process.env.GOPATH, 'bin')));
    } else {
      return childProcess.exec('go env GOPATH', function(err, stdout) {
        if (err) { return callback(err); }
        return callback(null, path.join(stdout.trim(), 'bin'));
      });
    }
  }
};


module.exports = getGoBin;
