const sinon = require('sinon');
const { assert } = require('chai');
const { EventEmitter } = require('events');

const CliReporter = require('../../../src/reporters/cli-reporter');
const { Logger } = require('../../../src/logger');

const loggerStdout = new Logger({ level: 'log', output: 'stdout', silent: true });
const loggerStderr = new Logger({ level: 'debug', silent: true });

const options = { loggerStdout, loggerStderr };

describe('CliReporter', () => {
  let test = {};

  describe('when starting', () => {
    beforeEach(() => sinon.spy(loggerStderr, 'info'));

    afterEach(() => loggerStderr.info.restore());

    it('should write starting to the console', (done) => {
      const emitter = new EventEmitter();
      (new CliReporter(emitter, {}, {}, true, undefined, options));
      emitter.emit('start', '', () => {
        assert.isOk(loggerStderr.info.calledOnce);
        done();
      });
    });
  });

  describe('when adding passing test', () => {
    before(() => {
      test = {
        status: 'pass',
        title: 'Passing Test'
      };
    });

    beforeEach(() => sinon.spy(loggerStdout, 'pass'));
    afterEach(() => loggerStdout.pass.restore());

    it('should write pass to the console', () => {
      const emitter = new EventEmitter();
      (new CliReporter(emitter, {}, {}, true, undefined, options));
      emitter.emit('test pass', test);
      assert.isOk(loggerStdout.pass.calledOnce);
    });

    describe('when details=true', () => {
      beforeEach(() => sinon.spy(loggerStderr, 'request'));
      afterEach(() => loggerStderr.request.restore());

      it('should write details for passing tests', () => {
        const emitter = new EventEmitter();
        (new CliReporter(emitter, {}, {}, true, true, options));
        emitter.emit('test pass', test);
        assert.isOk(loggerStderr.request.calledOnce);
      });
    });
  });

  describe('when adding failing test', () => {
    before(() => {
      test = {
        status: 'fail',
        title: 'Failing Test'
      };
    });

    describe('when errors are inline', () => {
      beforeEach(() => sinon.spy(loggerStdout, 'fail'));
      afterEach(() => loggerStdout.fail.restore());

      it('should write fail to the console', () => {
        const emitter = new EventEmitter();
        (new CliReporter(emitter, {}, {}, true, undefined, options));
        emitter.emit('test fail', test);
        assert.isOk(loggerStdout.fail.calledTwice);
      });
    });

    describe('when errors are aggregated', () => {
      beforeEach(() => sinon.spy(loggerStdout, 'fail'));
      afterEach(() => loggerStdout.fail.restore());

      it('should not write full failure to the console at the time of failure', () => {
        const emitter = new EventEmitter();
        (new CliReporter(emitter, {}, {}, false, undefined, options));
        emitter.emit('test fail', test);
        assert.isOk(loggerStdout.fail.calledOnce);
      });

      it('should write full failure to the console after execution is complete', (done) => {
        const emitter = new EventEmitter();
        const cliReporter = new CliReporter(emitter, {}, {}, false, undefined, options);
        cliReporter.errors = [test];
        emitter.emit('end', () => {
          assert.isOk(loggerStdout.fail.calledTwice);
          done();
        });
      });
    });
  });

  describe('when adding error test', () => {
    before(() => {
      test = {
        status: 'error',
        title: 'Error Test'
      };
    });

    beforeEach(() => sinon.spy(loggerStderr, 'error'));
    afterEach(() => loggerStderr.error.restore());

    it('should write error to the console', () => {
      const emitter = new EventEmitter();
      (new CliReporter(emitter, {}, {}, false, undefined, options));
      emitter.emit('test error', new Error('Error'), test);
      assert.isOk(loggerStderr.error.calledTwice);
    });
  });


  describe('when adding error test with connection refused', () => {
    before(() => {
      test = {
        status: 'error',
        title: 'Error Test'
      };
    });

    beforeEach(() => sinon.spy(loggerStderr, 'error'));
    afterEach(() => loggerStderr.error.restore());

    const connectionErrors = ['ECONNRESET', 'ENOTFOUND', 'ESOCKETTIMEDOUT', 'ETIMEDOUT', 'ECONNREFUSED', 'EHOSTUNREACH', 'EPIPE'];

    Array.from(connectionErrors).forEach(errType =>
      describe(`when error type ${errType}`, () =>
        it('should write error to the console', () => {
          const emitter = new EventEmitter();
          (new CliReporter(emitter, {}, {}, false, undefined, options));
          const error = new Error('connect');
          error.code = errType;
          emitter.emit('test error', error, test);

          const messages = Object.keys(loggerStderr.error.args).map((value, index) => loggerStderr.error.args[index][0]);

          assert.include(messages.join(), 'Error connecting');
        })
      )
    );
  });

  describe('when adding skipped test', () => {
    before(() => {
      test = {
        status: 'skip',
        title: 'Skipped Test'
      };
    });

    beforeEach(() => sinon.spy(loggerStdout, 'skip'));
    afterEach(() => loggerStdout.skip.restore());

    it('should write skip to the console', () => {
      const emitter = new EventEmitter();
      (new CliReporter(emitter, {}, {}, false, undefined, options));
      emitter.emit('test skip', test);
      assert.isOk(loggerStdout.skip.calledOnce);
    });
  });


  describe('when creating report', () => {
    before(() => {
      test = {
        status: 'fail',
        title: 'Failing Test'
      };
    });

    beforeEach(() => sinon.spy(loggerStdout, 'complete'));
    afterEach(() => loggerStdout.complete.restore());

    describe('when there is at least one test', () =>

      it('should write to the console', (done) => {
        const emitter = new EventEmitter();
        const cliReporter = new CliReporter(emitter, {}, {}, false, undefined, options);
        cliReporter.tests = [test];
        cliReporter.stats.tests = 1;
        emitter.emit('end', () => {
          assert.isOk(loggerStdout.complete.calledTwice);
          done();
        });
      })
    );

    describe('when there are no tests', () =>

      it('should write to the console', (done) => {
        const emitter = new EventEmitter();
        (new CliReporter(emitter, {}, {}, false, undefined, options));
        emitter.emit('end', () => {
          assert.isOk(loggerStdout.complete.calledOnce);
          done();
        });
      })
    );
  });
});
