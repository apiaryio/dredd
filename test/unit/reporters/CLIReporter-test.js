const proxyquire = require('proxyquire').noCallThru();
const sinon = require('sinon');
const { assert } = require('chai');
const { EventEmitter } = require('events');

const loggerStub = require('../../../lib/logger');

const CLIReporter = proxyquire('../../../lib/reporters/CLIReporter', {
  '../logger': loggerStub,
});

describe('CLIReporter', () => {
  let test = {};

  before(() => { loggerStub.transports.console.silent = true; });

  after(() => { loggerStub.transports.console.silent = false; });

  describe('when starting', () => {
    beforeEach(() => sinon.spy(loggerStub, 'info'));

    afterEach(() => loggerStub.info.restore());

    it('should write starting to the console', (done) => {
      const emitter = new EventEmitter();
      (new CLIReporter(emitter, {}, {}, true));
      emitter.emit('start', '', () => {
        assert.isOk(loggerStub.info.calledOnce);
        done();
      });
    });
  });

  describe('when adding passing test', () => {
    before(() => {
      test = {
        status: 'pass',
        title: 'Passing Test',
      };
    });

    beforeEach(() => sinon.spy(loggerStub, 'pass'));

    afterEach(() => loggerStub.pass.restore());

    it('should write pass to the console', () => {
      const emitter = new EventEmitter();
      (new CLIReporter(emitter, {}, {}, true));
      emitter.emit('test pass', test);
      assert.isOk(loggerStub.pass.calledOnce);
    });

    describe('when details=true', () => {
      beforeEach(() => sinon.spy(loggerStub, 'request'));

      afterEach(() => loggerStub.request.restore());

      it('should write details for passing tests', () => {
        const emitter = new EventEmitter();
        (new CLIReporter(emitter, {}, {}, true, true));
        emitter.emit('test pass', test);
        assert.isOk(loggerStub.request.calledOnce);
      });
    });
  });

  describe('when adding failing test', () => {
    before(() => {
      test = {
        status: 'fail',
        title: 'Failing Test',
      };
    });

    describe('when errors are inline', () => {
      beforeEach(() => sinon.spy(loggerStub, 'fail'));

      afterEach(() => loggerStub.fail.restore());

      it('should write fail to the console', () => {
        const emitter = new EventEmitter();
        (new CLIReporter(emitter, {}, {}, true));
        emitter.emit('test fail', test);
        assert.isOk(loggerStub.fail.calledTwice);
      });
    });

    describe('when errors are aggregated', () => {
      beforeEach(() => sinon.spy(loggerStub, 'fail'));

      afterEach(() => loggerStub.fail.restore());

      it('should not write full failure to the console at the time of failure', () => {
        const emitter = new EventEmitter();
        (new CLIReporter(emitter, {}, {}, false));
        emitter.emit('test fail', test);
        assert.isOk(loggerStub.fail.calledOnce);
      });

      it('should write full failure to the console after execution is complete', (done) => {
        const emitter = new EventEmitter();
        const cliReporter = new CLIReporter(emitter, {}, {}, false);
        cliReporter.errors = [test];
        emitter.emit('end', () => {
          assert.isOk(loggerStub.fail.calledTwice);
          done();
        });
      });
    });
  });

  describe('when adding error test', () => {
    before(() => {
      test = {
        status: 'error',
        title: 'Error Test',
      };
    });

    beforeEach(() => sinon.spy(loggerStub, 'error'));

    afterEach(() => loggerStub.error.restore());

    it('should write error to the console', () => {
      const emitter = new EventEmitter();
      (new CLIReporter(emitter, {}, {}, false));
      emitter.emit('test error', new Error('Error'), test);
      assert.isOk(loggerStub.error.calledTwice);
    });
  });


  describe('when adding error test with connection refused', () => {
    before(() => {
      test = {
        status: 'error',
        title: 'Error Test',
      };
    });

    beforeEach(() => sinon.spy(loggerStub, 'error'));

    afterEach(() => loggerStub.error.restore());

    const connectionErrors = ['ECONNRESET', 'ENOTFOUND', 'ESOCKETTIMEDOUT', 'ETIMEDOUT', 'ECONNREFUSED', 'EHOSTUNREACH', 'EPIPE'];

    Array.from(connectionErrors).forEach(errType => describe(`when error type ${errType}`, () => it('should write error to the console', () => {
      const emitter = new EventEmitter();
      (new CLIReporter(emitter, {}, {}, false));
      const error = new Error('connect');
      error.code = errType;
      emitter.emit('test error', error, test);

      const messages = Object.keys(loggerStub.error.args).map((value, index) => loggerStub.error.args[index][0]);

      assert.include(messages.join(), 'Error connecting');
    })));
  });

  describe('when adding skipped test', () => {
    before(() => {
      test = {
        status: 'skip',
        title: 'Skipped Test',
      };
    });

    beforeEach(() => sinon.spy(loggerStub, 'skip'));

    afterEach(() => loggerStub.skip.restore());

    it('should write skip to the console', () => {
      const emitter = new EventEmitter();
      (new CLIReporter(emitter, {}, {}, false));
      emitter.emit('test skip', test);
      assert.isOk(loggerStub.skip.calledOnce);
    });
  });


  describe('when creating report', () => {
    before(() => {
      test = {
        status: 'fail',
        title: 'Failing Test',
      };
    });

    beforeEach(() => sinon.spy(loggerStub, 'complete'));

    afterEach(() => loggerStub.complete.restore());

    describe('when there is at least one test', () => it('should write to the console', (done) => {
      const emitter = new EventEmitter();
      const cliReporter = new CLIReporter(emitter, {}, {}, false);
      cliReporter.tests = [test];
      cliReporter.stats.tests = 1;
      emitter.emit('end', () => {
        assert.isOk(loggerStub.complete.calledTwice);
        done();
      });
    }));

    describe('when there are no tests', () => it('should write to the console', (done) => {
      const emitter = new EventEmitter();
      (new CLIReporter(emitter, {}, {}, false));
      emitter.emit('end', () => {
        assert.isOk(loggerStub.complete.calledOnce);
        done();
      });
    }));
  });
});
