import sinon from 'sinon';
import { assert } from 'chai';

import * as helpers from './helpers';
import { spawn, signalTerm, signalKill } from '../../lib/childProcess';

const COFFEE_BIN = 'node_modules/.bin/coffee';
const WAIT_AFTER_COMMAND_SPAWNED_MS = 500;
const WAIT_AFTER_COMMAND_TERMINATED_MS = 1500;

function runChildProcess(command, fn, callback) {
  const onCrash = sinon.spy();

  const processInfo = {
    pid: undefined,
    stdout: '',
    stderr: '',
    terminated: false,
    exitStatus: undefined,
    signal: undefined,
    onCrash,
  };

  const childProcess = spawn(COFFEE_BIN, [command]);

  childProcess.stdout.on('data', (data) => {
    processInfo.stdout += data.toString();
  });
  childProcess.stderr.on('data', (data) => {
    processInfo.stderr += data.toString();
  });

  function onExit(exitStatus, signal) {
    processInfo.terminated = true;
    processInfo.exitStatus = exitStatus;
    processInfo.signal = signal;
  }
  childProcess.on('exit', onExit);

  const onError = (err) => {
    processInfo.error = err;
  };
  childProcess.on('error', onError);

  childProcess.on('crash', onCrash);

  setTimeout(() => {
    fn(childProcess);

    setTimeout(() => {
      childProcess.removeListener('exit', onExit);
      childProcess.removeListener('error', onError);
      childProcess.removeListener('crash', onCrash);

      processInfo.childProcess = childProcess;
      callback(null, processInfo);
    }, WAIT_AFTER_COMMAND_TERMINATED_MS);
  }, WAIT_AFTER_COMMAND_SPAWNED_MS);
}

describe('Babysitting Child Processes', () => {
  describe('when forcefully killed by childProcess.signalKill()', () => {
    describe('process with support for graceful termination', () => {
      let processInfo;

      before((done) =>
        runChildProcess(
          'test/fixtures/scripts/stdout.coffee',
          (childProcess) => childProcess.signalKill(),
          (err, info) => {
            processInfo = info;
            done(err);
          },
        ),
      );
      after((done) => helpers.kill(processInfo.childProcess.pid, done));

      it('does not log a message about being gracefully terminated', () =>
        assert.notInclude(processInfo.stdout, 'exiting'));
      it('gets terminated', () => assert.isTrue(processInfo.terminated));
      if (process.platform === 'win32') {
        it('returns non-zero status code', () =>
          assert.isAbove(processInfo.exitStatus, 0));
      } else {
        it('gets killed', () => assert.equal(processInfo.signal, 'SIGKILL'));
        it('returns no status code', () =>
          assert.isNull(processInfo.exitStatus));
      }
      it('does not emit an error', () => assert.isUndefined(processInfo.error));
    });

    describe('process without support for graceful termination', () => {
      let processInfo;

      before((done) =>
        runChildProcess(
          'test/fixtures/scripts/endless-ignore-term.coffee',
          (childProcess) => childProcess.signalKill(),
          (err, info) => {
            processInfo = info;
            done(err);
          },
        ),
      );
      after((done) => helpers.kill(processInfo.childProcess.pid, done));

      it('does not log a message about ignoring graceful termination', () =>
        assert.notInclude(processInfo.stdout, 'ignoring'));
      it('gets terminated', () => assert.isTrue(processInfo.terminated));
      if (process.platform === 'win32') {
        it('returns non-zero status code', () =>
          assert.isAbove(processInfo.exitStatus, 0));
      } else {
        it('gets killed', () => assert.equal(processInfo.signal, 'SIGKILL'));
        it('returns no status code', () =>
          assert.isNull(processInfo.exitStatus));
      }
      it('does not emit an error', () => assert.isUndefined(processInfo.error));
    });
  });
  ['signalTerm', 'terminate'].forEach((functionName) =>
    describe(`when gracefully terminated by childProcess.${functionName}()`, () => {
      describe('process with support for graceful termination', () => {
        let processInfo;

        before((done) =>
          runChildProcess(
            'test/fixtures/scripts/stdout.coffee',
            (childProcess) => childProcess[functionName](),
            (err, info) => {
              processInfo = info;
              done(err);
            },
          ),
        );
        after((done) => helpers.kill(processInfo.childProcess.pid, done));

        it('logs a message about being gracefully terminated', () =>
          assert.include(processInfo.stdout, 'exiting'));
        it('gets terminated', () => assert.isTrue(processInfo.terminated));
        if (process.platform !== 'win32') {
          // Windows does not have signals
          it('does not get terminated directly by the signal', () =>
            assert.isNull(processInfo.signal));
        }
        it('returns zero status code', () =>
          assert.equal(processInfo.exitStatus, 0));
        it('does not emit an error', () =>
          assert.isUndefined(processInfo.error));
      });

      describe('process without support for graceful termination', () => {
        let processInfo;

        before((done) =>
          runChildProcess(
            'test/fixtures/scripts/endless-ignore-term.coffee',
            (childProcess) => childProcess.terminate(),
            (err, info) => {
              processInfo = info;
              done(err);
            },
          ),
        );
        after((done) => helpers.kill(processInfo.childProcess.pid, done));

        it('logs a message about ignoring the graceful termination attempt', () =>
          assert.include(processInfo.stdout, 'ignoring'));
        it('does not get terminated', () =>
          assert.isFalse(processInfo.terminated));
        it('has undefined status code', () =>
          assert.isUndefined(processInfo.exitStatus));
        it('emits an error', () => assert.instanceOf(processInfo.error, Error));
        it('the error has a message about unsuccessful termination', () =>
          assert.equal(
            processInfo.error.message,
            `Unable to gracefully terminate process ${processInfo.childProcess.pid}`,
          ));
      });
    }),
  );

  describe("when gracefully terminated by childProcess.terminate({'force': true})", () => {
    describe('process with support for graceful termination', () => {
      let processInfo;

      before((done) =>
        runChildProcess(
          'test/fixtures/scripts/stdout.coffee',
          (childProcess) => childProcess.terminate({ force: true }),
          (err, info) => {
            processInfo = info;
            done(err);
          },
        ),
      );
      after((done) => helpers.kill(processInfo.childProcess.pid, done));

      it('logs a message about being gracefully terminated', () =>
        assert.include(processInfo.stdout, 'exiting'));
      it('gets terminated', () => assert.isTrue(processInfo.terminated));
      if (process.platform !== 'win32') {
        // Windows does not have signals
        it('does not get terminated directly by the signal', () =>
          assert.isNull(processInfo.signal));
      }
      it('returns zero status code', () =>
        assert.equal(processInfo.exitStatus, 0));
      it('does not emit an error', () => assert.isUndefined(processInfo.error));
    });

    describe('process without support for graceful termination', () => {
      let processInfo;

      before((done) =>
        runChildProcess(
          'test/fixtures/scripts/endless-ignore-term.coffee',
          (childProcess) => childProcess.terminate({ force: true }),
          (err, info) => {
            processInfo = info;
            done(err);
          },
        ),
      );
      after((done) => helpers.kill(processInfo.childProcess.pid, done));

      it('logs a message about ignoring the graceful termination attempt', () =>
        assert.include(processInfo.stdout, 'ignoring'));
      it('gets terminated', () => assert.isTrue(processInfo.terminated));
      if (process.platform === 'win32') {
        // Windows does not have signals and when a process gets
        // forcefully terminated, it has a non-zero status code.
        it('returns non-zero status code', () =>
          assert.isAbove(processInfo.exitStatus, 0));
      } else {
        it('gets killed', () => assert.equal(processInfo.signal, 'SIGKILL'));
        it('returns no status code', () =>
          assert.isNull(processInfo.exitStatus));
      }
      it('does not emit an error', () => assert.isUndefined(processInfo.error));
    });
  });

  describe('when child process terminates', () => {
    describe('normally with zero status code', () => {
      let processInfo;

      before((done) =>
        // eslint-disable-next-line
        runChildProcess(
          'test/fixtures/scripts/exit-0.coffee',
          () => true,
          (err, info) => {
            processInfo = info;
            done(err);
          },
        ),
      );
      after((done) => helpers.kill(processInfo.childProcess.pid, done));

      it('returns zero status code', () =>
        assert.equal(processInfo.exitStatus, 0));
      it("does not emit the 'crash' event", () =>
        assert.isFalse(processInfo.onCrash.called));
      it('is flagged as terminated', () =>
        assert.isTrue(processInfo.childProcess.terminated));
      it('is not flagged as intentionally killed', () =>
        assert.isFalse(processInfo.childProcess.killedIntentionally));
      it('is not flagged as intentionally terminated', () =>
        assert.isFalse(processInfo.childProcess.terminatedIntentionally));
    });

    describe('normally with non-zero status code', () => {
      let processInfo;

      before((done) =>
        // eslint-disable-next-line
        runChildProcess(
          'test/fixtures/scripts/exit-3.coffee',
          () => true,
          (err, info) => {
            processInfo = info;
            done(err);
          },
        ),
      );
      after((done) => helpers.kill(processInfo.childProcess.pid, done));

      it('returns non-zero status code', () =>
        assert.isAbove(processInfo.exitStatus, 0));
      it("does emit the 'crash' event", () =>
        assert.isTrue(processInfo.onCrash.called));
      it("the 'crash' event is provided with non-zero status code", () =>
        assert.isAbove(processInfo.onCrash.getCall(0).args[0], 0));
      it("the 'crash' event is not provided with killed flag", () =>
        assert.isFalse(processInfo.onCrash.getCall(0).args[1]));
      it('is flagged as terminated', () =>
        assert.isTrue(processInfo.childProcess.terminated));
      it('is not flagged as intentionally killed', () =>
        assert.isFalse(processInfo.childProcess.killedIntentionally));
      it('is not flagged as intentionally terminated', () =>
        assert.isFalse(processInfo.childProcess.terminatedIntentionally));
    });

    describe('intentionally gracefully with zero status code', () => {
      let processInfo;

      before((done) =>
        runChildProcess(
          'test/fixtures/scripts/stdout.coffee',
          (childProcess) => childProcess.signalTerm(),
          (err, info) => {
            processInfo = info;
            done(err);
          },
        ),
      );
      after((done) => helpers.kill(processInfo.childProcess.pid, done));

      it('returns zero status code', () =>
        assert.equal(processInfo.exitStatus, 0));
      it("does not emit the 'crash' event", () =>
        assert.isFalse(processInfo.onCrash.called));
      it('is flagged as terminated', () =>
        assert.isTrue(processInfo.childProcess.terminated));
      it('is not flagged as intentionally killed', () =>
        assert.isFalse(processInfo.childProcess.killedIntentionally));
      it('is flagged as intentionally terminated', () =>
        assert.isTrue(processInfo.childProcess.terminatedIntentionally));
    });

    describe('intentionally gracefully with non-zero status code', () => {
      let processInfo;

      before((done) =>
        runChildProcess(
          'test/fixtures/scripts/stdout-exit-3.coffee',
          (childProcess) => childProcess.signalTerm(),
          (err, info) => {
            processInfo = info;
            done(err);
          },
        ),
      );
      after((done) => helpers.kill(processInfo.childProcess.pid, done));

      it('returns non-zero status code', () =>
        assert.isAbove(processInfo.exitStatus, 0));
      it("does not emit the 'crash' event", () =>
        assert.isFalse(processInfo.onCrash.called));
      it('is flagged as terminated', () =>
        assert.isTrue(processInfo.childProcess.terminated));
      it('is not flagged as intentionally killed', () =>
        assert.isFalse(processInfo.childProcess.killedIntentionally));
      it('is flagged as intentionally terminated', () =>
        assert.isTrue(processInfo.childProcess.terminatedIntentionally));
    });

    describe('intentionally forcefully', () => {
      let processInfo;

      before((done) =>
        runChildProcess(
          'test/fixtures/scripts/stdout.coffee',
          (childProcess) => childProcess.signalKill(),
          (err, info) => {
            processInfo = info;
            done(err);
          },
        ),
      );
      after((done) => helpers.kill(processInfo.childProcess.pid, done));

      if (process.platform === 'win32') {
        it('returns non-zero status code', () =>
          assert.isAbove(processInfo.exitStatus, 0));
      } else {
        it('gets killed', () => assert.equal(processInfo.signal, 'SIGKILL'));
        it('returns no status code', () =>
          assert.isNull(processInfo.exitStatus));
      }
      it("does not emit the 'crash' event", () =>
        assert.isFalse(processInfo.onCrash.called));
      it('is flagged as terminated', () =>
        assert.isTrue(processInfo.childProcess.terminated));
      it('is flagged as intentionally killed', () =>
        assert.isTrue(processInfo.childProcess.killedIntentionally));
      it('is not flagged as intentionally terminated', () =>
        assert.isFalse(processInfo.childProcess.terminatedIntentionally));
    });

    describe('gracefully with zero status code', () => {
      let processInfo;

      before((done) =>
        runChildProcess(
          'test/fixtures/scripts/stdout.coffee',
          (childProcess) => {
            // Simulate that the process was terminated externally
            const emit = sinon.stub(childProcess, 'emit');
            signalTerm(childProcess, () => {});
            emit.restore();
          },
          (err, info) => {
            processInfo = info;
            done(err);
          },
        ),
      );
      after((done) => helpers.kill(processInfo.childProcess.pid, done));

      it('returns zero status code', () =>
        assert.equal(processInfo.exitStatus, 0));
      it("does not emit the 'crash' event", () =>
        assert.isFalse(processInfo.onCrash.called));
      it('is flagged as terminated', () =>
        assert.isTrue(processInfo.childProcess.terminated));
      it('is not flagged as intentionally killed', () =>
        assert.isFalse(processInfo.childProcess.killedIntentionally));
      it('is not flagged as intentionally terminated', () =>
        assert.isFalse(processInfo.childProcess.terminatedIntentionally));
    });

    describe('gracefully with non-zero status code', () => {
      let processInfo;

      before((done) =>
        runChildProcess(
          'test/fixtures/scripts/stdout-exit-3.coffee',
          (childProcess) => {
            // Simulate that the process was terminated externally
            const emit = sinon.stub(childProcess, 'emit');
            signalTerm(childProcess, () => {});
            emit.restore();
          },
          (err, info) => {
            processInfo = info;
            done(err);
          },
        ),
      );
      after((done) => helpers.kill(processInfo.childProcess.pid, done));

      it('returns non-zero status code', () =>
        assert.isAbove(processInfo.exitStatus, 0));
      it("does emit the 'crash' event", () =>
        assert.isTrue(processInfo.onCrash.called));
      it("the 'crash' event is provided with non-zero status code", () =>
        assert.isAbove(processInfo.onCrash.getCall(0).args[0], 0));
      it("the 'crash' event is not provided with killed flag", () =>
        assert.isFalse(processInfo.onCrash.getCall(0).args[1]));
      it('is flagged as terminated', () =>
        assert.isTrue(processInfo.childProcess.terminated));
      it('is not flagged as intentionally killed', () =>
        assert.isFalse(processInfo.childProcess.killedIntentionally));
      it('is not flagged as intentionally terminated', () =>
        assert.isFalse(processInfo.childProcess.terminatedIntentionally));
    });

    describe('forcefully', () => {
      let processInfo;

      before((done) =>
        runChildProcess(
          'test/fixtures/scripts/stdout.coffee',
          (childProcess) => {
            // Simulate that the process was killed externally
            const emit = sinon.stub(childProcess, 'emit');
            signalKill(childProcess, () => {});
            emit.restore();
          },
          (err, info) => {
            processInfo = info;
            done(err);
          },
        ),
      );
      after((done) => helpers.kill(processInfo.childProcess.pid, done));

      if (process.platform === 'win32') {
        it('returns non-zero status code', () =>
          assert.isAbove(processInfo.exitStatus, 0));
      } else {
        it('gets killed', () => assert.equal(processInfo.signal, 'SIGKILL'));
        it('returns no status code', () =>
          assert.isNull(processInfo.exitStatus));
      }
      it("does emit the 'crash' event", () =>
        assert.isTrue(processInfo.onCrash.called));
      if (process.platform === 'win32') {
        it("the 'crash' event is provided with non-zero status code", () =>
          assert.isAbove(processInfo.onCrash.getCall(0).args[0], 0));
        it("the 'crash' event is not provided with killed flag (cannot be detected on Windows)", () =>
          assert.isFalse(processInfo.onCrash.getCall(0).args[1]));
      } else {
        it("the 'crash' event is provided with no status code", () =>
          assert.isNull(processInfo.onCrash.getCall(0).args[0]));
        it("the 'crash' event is provided with killed flag", () =>
          assert.isTrue(processInfo.onCrash.getCall(0).args[1]));
      }
      it('is flagged as terminated', () =>
        assert.isTrue(processInfo.childProcess.terminated));
      it('is not flagged as intentionally killed', () =>
        assert.isFalse(processInfo.childProcess.killedIntentionally));
      it('is not flagged as intentionally terminated', () =>
        assert.isFalse(processInfo.childProcess.terminatedIntentionally));
    });
  });
});
