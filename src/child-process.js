// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
const crossSpawn = require('cross-spawn');


const IS_WINDOWS = process.platform === 'win32';
const ASCII_CTRL_C = 3;

const TERM_FIRST_CHECK_TIMEOUT_MS = 1;
const TERM_DEFAULT_TIMEOUT_MS = 1000;
const TERM_DEFAULT_RETRY_MS = 300;


// Signals the child process to forcefully terminate
const signalKill = function(childProcess, callback) {
  childProcess.emit('signalKill');
  if (IS_WINDOWS) {
    const taskkill = spawn('taskkill', ['/F', '/T', '/PID', childProcess.pid]);
    return taskkill.on('exit', function(exitStatus) {
      if (exitStatus) {
        const err = new Error(`Unable to forcefully terminate process ${childProcess.pid}`);
        return callback(err);
      }
      return callback();
    });
  } else {
    childProcess.kill('SIGKILL');
    return process.nextTick(callback);
  }
};


// Signals the child process to gracefully terminate
const signalTerm = function(childProcess, callback) {
  childProcess.emit('signalTerm');
  if (IS_WINDOWS) {
    // On Windows, there is no such way as SIGTERM or SIGINT. The closest
    // thing is to interrupt the process with Ctrl+C. Under the hood, that
    // generates '\u0003' character on stdin of the process and if
    // the process listens on stdin, it's able to catch this as 'SIGINT'.
    //
    // However, that only works if user does it manually. There is no
    // way to do it programmatically, at least not in Node.js (and even
    // for C/C++, all the solutions are dirty hacks). Even if you send
    // the very same character to stdin of the process, it's not
    // recognized (the rl.on('SIGINT') event won't get triggered)
    // for some reason.
    //
    // The only thing Dredd is left with is a convention. So when Dredd
    // wants to gracefully signal to the child process it should terminate,
    // it sends the '\u0003' to stdin of the child. It's up to the child
    // to implement reading from stdin in such way it works both for
    // programmatic and manual Ctrl+C.
    childProcess.stdin.write(String.fromCharCode(ASCII_CTRL_C));
  } else {
    childProcess.kill('SIGTERM');
  }
  return process.nextTick(callback);
};


// Gracefully terminates a child process
//
// Sends a signal to the process as a heads up it should terminate.
// Then checks multiple times whether the process terminated. Retries
// sending the signal. In case it's not able to terminate the process
// within given timeout, it returns an error.
//
// If provided with the 'force' option, instead of returning an error,
// it kills the process unconditionally.
//
// Available options:
// - timeout (number) - Time period in ms for which the termination
//                      attempts will be done
// - retryDelay (number) - Delay in ms between termination attempts
// - force (boolean) - Kills the process forcefully after the timeout
const terminate = function(childProcess, options = {}, callback) {
  if (typeof options === 'function') { [callback, options] = Array.from([options, {}]); }
  const force = options.force || false;

  // If the timeout is zero or less then the delay for waiting between
  // retries, there will be just one termination attempt
  const timeout = (options.timeout != null) ? options.timeout : TERM_DEFAULT_TIMEOUT_MS;
  const retryDelay = (options.retryDelay != null) ? options.retryDelay : TERM_DEFAULT_RETRY_MS;

  let terminated = false;
  var onExit = function() {
    terminated = true;
    return childProcess.removeListener('exit', onExit);
  };
  childProcess.on('exit', onExit);

  const start = Date.now();
  let t = undefined;

  // A function representing one check, whether the process already
  // ended or not. It is repeatedly called until the timeout has passed.
  var check = function() {
    if (terminated) {
      // Successfully terminated
      clearTimeout(t);
      return callback();
    } else {
      if ((Date.now() - start) < timeout) {
        // Still not terminated, try again
        return signalTerm(childProcess, function(err) {
          if (err) { return callback(err); }
          return t = setTimeout(check, retryDelay);
        });
      } else {
        // Still not terminated and the timeout has passed, either
        // kill the process (force) or provide an error
        clearTimeout(t);
        if (force) {
          return signalKill(childProcess, callback);
        } else {
          return callback(new Error(`Unable to gracefully terminate process ${childProcess.pid}`));
        }
      }
    }
  };

  // Fire the first termination attempt and check the result
  return signalTerm(childProcess, function(err) {
    if (err) { return callback(err); }
    return t = setTimeout(check, TERM_FIRST_CHECK_TIMEOUT_MS);
  });
};


var spawn = function(...args) {
  const childProcess = crossSpawn.spawn.apply(null, args);

  childProcess.spawned = true;
  childProcess.terminated = false;
  let killedIntentionally = false;
  let terminatedIntentionally = false;

  childProcess.on('signalKill', () => killedIntentionally = true);
  childProcess.on('signalTerm', () => terminatedIntentionally = true);

  childProcess.signalKill = () =>
    signalKill(childProcess, function(err) {
      if (err) { return childProcess.emit('error', err); }
    })
  ;

  childProcess.signalTerm = () =>
    signalTerm(childProcess, function(err) {
      if (err) { return childProcess.emit('error', err); }
    })
  ;

  childProcess.terminate = options =>
    terminate(childProcess, options, function(err) {
      if (err) { return childProcess.emit('error', err); }
    })
  ;

  childProcess.on('error', function(err) {
    if (err.syscall && (err.syscall.indexOf('spawn') >= 0)) { return childProcess.spawned = false; }
  });

  childProcess.on('exit', function(exitStatus, signal) {
    childProcess.terminated = true;
    childProcess.killedIntentionally = killedIntentionally;
    childProcess.terminatedIntentionally = terminatedIntentionally;

    // Crash detection. Emits a 'crash' event in case the process
    // unintentionally terminated with non-zero status code.
    // The 'crash' event's signature:
    //
    // - exitStatus (number, nullable) - The non-zero status code
    // - killed (boolean) - Whether the process was killed or not
    //
    // How to distinguish a process was killed?
    //
    // UNIX:
    // - exitStatus is null or 137 or... https://github.com/apiaryio/dredd/issues/735
    // - signal is 'SIGKILL'
    //
    // Windows:
    // - exitStatus is usually 1
    // - signal isn't set (Windows do not have signals)
    //
    // Yes, you got it - on Windows there's no way to distinguish
    // a process was forcefully killed...
    if (!killedIntentionally && !terminatedIntentionally) {
      if (signal === 'SIGKILL') {
        return childProcess.emit('crash', null, true);
      } else if (exitStatus !== 0) {
        return childProcess.emit('crash', exitStatus, false);
      }
    }
  });

  return childProcess;
};


module.exports = {
  signalKill,
  signalTerm,
  terminate,
  spawn
};
