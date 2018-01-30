const {assert} = require('chai');
const sinon = require('sinon');

const helpers = require('./helpers');
const {spawn, signalTerm, signalKill} = require('../../src/child-process');

const COFFEE_BIN = 'node_modules/.bin/coffee';
const WAIT_AFTER_COMMAND_SPAWNED_MS = 500;
const WAIT_AFTER_COMMAND_TERMINATED_MS = 1500;


const runChildProcess = function(command, fn, callback) {
  const onCrash = sinon.spy();

  const processInfo = {
    pid: undefined,
    stdout: '',
    stderr: '',
    terminated: false,
    exitStatus: undefined,
    signal: undefined,
    onCrash
  };

  const childProcess = spawn(COFFEE_BIN, [command]);

  childProcess.stdout.on('data', data => processInfo.stdout += data.toString());
  childProcess.stderr.on('data', data => processInfo.stderr += data.toString());

  const onExit = function(exitStatus, signal) {
    processInfo.terminated = true;
    processInfo.exitStatus = exitStatus;
    return processInfo.signal = signal;
  };
  childProcess.on('exit', onExit);

  const onError = err => processInfo.error = err;
  childProcess.on('error', onError);

  childProcess.on('crash', onCrash);

  return setTimeout( function() {
    fn(childProcess);

    return setTimeout( function() {
      childProcess.removeListener('exit', onExit);
      childProcess.removeListener('error', onError);
      childProcess.removeListener('crash', onCrash);

      processInfo.childProcess = childProcess;
      return callback(null, processInfo);
    }
    , WAIT_AFTER_COMMAND_TERMINATED_MS);
  }
  , WAIT_AFTER_COMMAND_SPAWNED_MS);
};


describe('Babysitting Child Processes', function() {
  describe('when forcefully killed by childProcess.signalKill()', function() {
    describe('process with support for graceful termination', function() {
      let processInfo = undefined;

      before(done =>
        runChildProcess('test/fixtures/scripts/stdout.coffee', childProcess => childProcess.signalKill()
        , function(err, info) {
          processInfo = info;
          return done(err);
        })
      );
      after(done => helpers.kill(processInfo.childProcess.pid, done));

      it('does not log a message about being gracefully terminated', () => assert.notInclude(processInfo.stdout, 'exiting'));
      it('gets terminated', () => assert.isTrue(processInfo.terminated));
      if (process.platform === 'win32') {
        it('returns non-zero status code', () => assert.isAbove(processInfo.exitStatus, 0));
      } else {
        it('gets killed', () => assert.equal(processInfo.signal, 'SIGKILL'));
        it('returns no status code', () => assert.isNull(processInfo.exitStatus));
      }
      return it('does not emit an error', () => assert.isUndefined(processInfo.error));
    });

    return describe('process without support for graceful termination', function() {
      let processInfo = undefined;

      before(done =>
        runChildProcess('test/fixtures/scripts/endless-ignore-term.coffee', childProcess => childProcess.signalKill()
        , function(err, info) {
          processInfo = info;
          return done(err);
        })
      );
      after(done => helpers.kill(processInfo.childProcess.pid, done));

      it('does not log a message about ignoring graceful termination', () => assert.notInclude(processInfo.stdout, 'ignoring'));
      it('gets terminated', () => assert.isTrue(processInfo.terminated));
      if (process.platform === 'win32') {
        it('returns non-zero status code', () => assert.isAbove(processInfo.exitStatus, 0));
      } else {
        it('gets killed', () => assert.equal(processInfo.signal, 'SIGKILL'));
        it('returns no status code', () => assert.isNull(processInfo.exitStatus));
      }
      return it('does not emit an error', () => assert.isUndefined(processInfo.error));
    });
  });

  ['signalTerm', 'terminate'].forEach(functionName =>
    describe(`when gracefully terminated by childProcess.${functionName}()`, function() {
      describe('process with support for graceful termination', function() {
        let processInfo = undefined;

        before(done =>
          runChildProcess('test/fixtures/scripts/stdout.coffee', childProcess => childProcess[functionName]()
          , function(err, info) {
            processInfo = info;
            return done(err);
          })
        );
        after(done => helpers.kill(processInfo.childProcess.pid, done));

        it('logs a message about being gracefully terminated', () => assert.include(processInfo.stdout, 'exiting'));
        it('gets terminated', () => assert.isTrue(processInfo.terminated));
        if (process.platform !== 'win32') { // Windows does not have signals
          it('does not get terminated directly by the signal', () => assert.isNull(processInfo.signal));
        }
        it('returns zero status code', () => assert.equal(processInfo.exitStatus, 0));
        return it('does not emit an error', () => assert.isUndefined(processInfo.error));
      });

      return describe('process without support for graceful termination', function() {
        let processInfo = undefined;

        before(done =>
          runChildProcess('test/fixtures/scripts/endless-ignore-term.coffee', childProcess => childProcess.terminate()
          , function(err, info) {
            processInfo = info;
            return done(err);
          })
        );
        after(done => helpers.kill(processInfo.childProcess.pid, done));

        it('logs a message about ignoring the graceful termination attempt', () => assert.include(processInfo.stdout, 'ignoring'));
        it('does not get terminated', () => assert.isFalse(processInfo.terminated));
        it('has undefined status code', () => assert.isUndefined(processInfo.exitStatus));
        it('emits an error', () => assert.instanceOf(processInfo.error, Error));
        return it('the error has a message about unsuccessful termination', () =>
          assert.equal(
            processInfo.error.message,
            `Unable to gracefully terminate process ${processInfo.childProcess.pid}`
          )
        );
      });
    })
  );

  describe('when gracefully terminated by childProcess.terminate({\'force\': true})', function() {
    describe('process with support for graceful termination', function() {
      let processInfo = undefined;

      before(done =>
        runChildProcess('test/fixtures/scripts/stdout.coffee', childProcess => childProcess.terminate({force: true})
        , function(err, info) {
          processInfo = info;
          return done(err);
        })
      );
      after(done => helpers.kill(processInfo.childProcess.pid, done));

      it('logs a message about being gracefully terminated', () => assert.include(processInfo.stdout, 'exiting'));
      it('gets terminated', () => assert.isTrue(processInfo.terminated));
      if (process.platform !== 'win32') { // Windows does not have signals
        it('does not get terminated directly by the signal', () => assert.isNull(processInfo.signal));
      }
      it('returns zero status code', () => assert.equal(processInfo.exitStatus, 0));
      return it('does not emit an error', () => assert.isUndefined(processInfo.error));
    });

    return describe('process without support for graceful termination', function() {
      let processInfo = undefined;

      before(done =>
        runChildProcess('test/fixtures/scripts/endless-ignore-term.coffee', childProcess => childProcess.terminate({force: true})
        , function(err, info) {
          processInfo = info;
          return done(err);
        })
      );
      after(done => helpers.kill(processInfo.childProcess.pid, done));

      it('logs a message about ignoring the graceful termination attempt', () => assert.include(processInfo.stdout, 'ignoring'));
      it('gets terminated', () => assert.isTrue(processInfo.terminated));
      if (process.platform === 'win32') {
        // Windows does not have signals and when a process gets
        // forcefully terminated, it has a non-zero status code.
        it('returns non-zero status code', () => assert.isAbove(processInfo.exitStatus, 0));
      } else {
        it('gets killed', () => assert.equal(processInfo.signal, 'SIGKILL'));
        it('returns no status code', () => assert.isNull(processInfo.exitStatus));
      }
      return it('does not emit an error', () => assert.isUndefined(processInfo.error));
    });
  });

  return describe('when child process terminates', function() {
    describe('normally with zero status code', function() {
      let processInfo = undefined;

      before(done =>
        runChildProcess('test/fixtures/scripts/exit-0.coffee', childProcess => true
        , function(err, info) {
          processInfo = info;
          return done(err);
        })
      );
      after(done => helpers.kill(processInfo.childProcess.pid, done));

      it('returns zero status code', () => assert.equal(processInfo.exitStatus, 0));
      it('does not emit the \'crash\' event', () => assert.isFalse(processInfo.onCrash.called));
      it('is flagged as terminated', () => assert.isTrue(processInfo.childProcess.terminated));
      it('is not flagged as intentionally killed', () => assert.isFalse(processInfo.childProcess.killedIntentionally));
      return it('is not flagged as intentionally terminated', () => assert.isFalse(processInfo.childProcess.terminatedIntentionally));
    });

    describe('normally with non-zero status code', function() {
      let processInfo = undefined;

      before(done =>
        runChildProcess('test/fixtures/scripts/exit-3.coffee', childProcess => true
        , function(err, info) {
          processInfo = info;
          return done(err);
        })
      );
      after(done => helpers.kill(processInfo.childProcess.pid, done));

      it('returns non-zero status code', () => assert.isAbove(processInfo.exitStatus, 0));
      it('does emit the \'crash\' event', () => assert.isTrue(processInfo.onCrash.called));
      it('the \'crash\' event is provided with non-zero status code', () => assert.isAbove(processInfo.onCrash.getCall(0).args[0], 0));
      it('the \'crash\' event is not provided with killed flag', () => assert.isFalse(processInfo.onCrash.getCall(0).args[1]));
      it('is flagged as terminated', () => assert.isTrue(processInfo.childProcess.terminated));
      it('is not flagged as intentionally killed', () => assert.isFalse(processInfo.childProcess.killedIntentionally));
      return it('is not flagged as intentionally terminated', () => assert.isFalse(processInfo.childProcess.terminatedIntentionally));
    });

    describe('intentionally gracefully with zero status code', function() {
      let processInfo = undefined;

      before(done =>
        runChildProcess('test/fixtures/scripts/stdout.coffee', childProcess => childProcess.signalTerm()
        , function(err, info) {
          processInfo = info;
          return done(err);
        })
      );
      after(done => helpers.kill(processInfo.childProcess.pid, done));

      it('returns zero status code', () => assert.equal(processInfo.exitStatus, 0));
      it('does not emit the \'crash\' event', () => assert.isFalse(processInfo.onCrash.called));
      it('is flagged as terminated', () => assert.isTrue(processInfo.childProcess.terminated));
      it('is not flagged as intentionally killed', () => assert.isFalse(processInfo.childProcess.killedIntentionally));
      return it('is flagged as intentionally terminated', () => assert.isTrue(processInfo.childProcess.terminatedIntentionally));
    });

    describe('intentionally gracefully with non-zero status code', function() {
      let processInfo = undefined;

      before(done =>
        runChildProcess('test/fixtures/scripts/stdout-exit-3.coffee', childProcess => childProcess.signalTerm()
        , function(err, info) {
          processInfo = info;
          return done(err);
        })
      );
      after(done => helpers.kill(processInfo.childProcess.pid, done));

      it('returns non-zero status code', () => assert.isAbove(processInfo.exitStatus, 0));
      it('does not emit the \'crash\' event', () => assert.isFalse(processInfo.onCrash.called));
      it('is flagged as terminated', () => assert.isTrue(processInfo.childProcess.terminated));
      it('is not flagged as intentionally killed', () => assert.isFalse(processInfo.childProcess.killedIntentionally));
      return it('is flagged as intentionally terminated', () => assert.isTrue(processInfo.childProcess.terminatedIntentionally));
    });

    describe('intentionally forcefully', function() {
      let processInfo = undefined;

      before(done =>
        runChildProcess('test/fixtures/scripts/stdout.coffee', childProcess => childProcess.signalKill()
        , function(err, info) {
          processInfo = info;
          return done(err);
        })
      );
      after(done => helpers.kill(processInfo.childProcess.pid, done));

      if (process.platform === 'win32') {
        it('returns non-zero status code', () => assert.isAbove(processInfo.exitStatus, 0));
      } else {
        it('gets killed', () => assert.equal(processInfo.signal, 'SIGKILL'));
        it('returns no status code', () => assert.isNull(processInfo.exitStatus));
      }
      it('does not emit the \'crash\' event', () => assert.isFalse(processInfo.onCrash.called));
      it('is flagged as terminated', () => assert.isTrue(processInfo.childProcess.terminated));
      it('is flagged as intentionally killed', () => assert.isTrue(processInfo.childProcess.killedIntentionally));
      return it('is not flagged as intentionally terminated', () => assert.isFalse(processInfo.childProcess.terminatedIntentionally));
    });

    describe('gracefully with zero status code', function() {
      let processInfo = undefined;

      before(done =>
        runChildProcess('test/fixtures/scripts/stdout.coffee', function(childProcess) {
          // simulate that the process was terminated externally
          const emit = sinon.stub(childProcess, 'emit');
          signalTerm(childProcess, function() {} );
          return emit.restore();
        }
        , function(err, info) {
          processInfo = info;
          return done(err);
        })
      );
      after(done => helpers.kill(processInfo.childProcess.pid, done));

      it('returns zero status code', () => assert.equal(processInfo.exitStatus, 0));
      it('does not emit the \'crash\' event', () => assert.isFalse(processInfo.onCrash.called));
      it('is flagged as terminated', () => assert.isTrue(processInfo.childProcess.terminated));
      it('is not flagged as intentionally killed', () => assert.isFalse(processInfo.childProcess.killedIntentionally));
      return it('is not flagged as intentionally terminated', () => assert.isFalse(processInfo.childProcess.terminatedIntentionally));
    });

    describe('gracefully with non-zero status code', function() {
      let processInfo = undefined;

      before(done =>
        runChildProcess('test/fixtures/scripts/stdout-exit-3.coffee', function(childProcess) {
          // simulate that the process was terminated externally
          const emit = sinon.stub(childProcess, 'emit');
          signalTerm(childProcess, function() {} );
          return emit.restore();
        }
        , function(err, info) {
          processInfo = info;
          return done(err);
        })
      );
      after(done => helpers.kill(processInfo.childProcess.pid, done));

      it('returns non-zero status code', () => assert.isAbove(processInfo.exitStatus, 0));
      it('does emit the \'crash\' event', () => assert.isTrue(processInfo.onCrash.called));
      it('the \'crash\' event is provided with non-zero status code', () => assert.isAbove(processInfo.onCrash.getCall(0).args[0], 0));
      it('the \'crash\' event is not provided with killed flag', () => assert.isFalse(processInfo.onCrash.getCall(0).args[1]));
      it('is flagged as terminated', () => assert.isTrue(processInfo.childProcess.terminated));
      it('is not flagged as intentionally killed', () => assert.isFalse(processInfo.childProcess.killedIntentionally));
      return it('is not flagged as intentionally terminated', () => assert.isFalse(processInfo.childProcess.terminatedIntentionally));
    });

    return describe('forcefully', function() {
      let processInfo = undefined;

      before(done =>
        runChildProcess('test/fixtures/scripts/stdout.coffee', function(childProcess) {
          // simulate that the process was killed externally
          const emit = sinon.stub(childProcess, 'emit');
          signalKill(childProcess, function() {} );
          return emit.restore();
        }
        , function(err, info) {
          processInfo = info;
          return done(err);
        })
      );
      after(done => helpers.kill(processInfo.childProcess.pid, done));

      if (process.platform === 'win32') {
        it('returns non-zero status code', () => assert.isAbove(processInfo.exitStatus, 0));
      } else {
        it('gets killed', () => assert.equal(processInfo.signal, 'SIGKILL'));
        it('returns no status code', () => assert.isNull(processInfo.exitStatus));
      }
      it('does emit the \'crash\' event', () => assert.isTrue(processInfo.onCrash.called));
      if (process.platform === 'win32') {
        it('the \'crash\' event is provided with non-zero status code', () => assert.isAbove(processInfo.onCrash.getCall(0).args[0], 0));
        it('the \'crash\' event is not provided with killed flag (cannot be detected on Windows)', () => assert.isFalse(processInfo.onCrash.getCall(0).args[1]));
      } else {
        it('the \'crash\' event is provided with no status code', () => assert.isNull(processInfo.onCrash.getCall(0).args[0]));
        it('the \'crash\' event is provided with killed flag', () => assert.isTrue(processInfo.onCrash.getCall(0).args[1]));
      }
      it('is flagged as terminated', () => assert.isTrue(processInfo.childProcess.terminated));
      it('is not flagged as intentionally killed', () => assert.isFalse(processInfo.childProcess.killedIntentionally));
      return it('is not flagged as intentionally terminated', () => assert.isFalse(processInfo.childProcess.terminatedIntentionally));
    });
  });
});
