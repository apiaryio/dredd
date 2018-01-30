const {assert} = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

const {EventEmitter} = require('events');
const loggerStub = require('../../../src/logger');
const CliReporter = proxyquire('../../../src/reporters/cli-reporter', {
  './../logger' : loggerStub
});



describe('CliReporter', function() {

  let test = {};

  before(() => loggerStub.transports.console.silent = true);

  after(() => loggerStub.transports.console.silent = false);

  describe('when starting', function() {

    beforeEach(() => sinon.spy(loggerStub, 'info'));

    afterEach(() => loggerStub.info.restore());

    return it('should write starting to the console', function(done) {
      const emitter = new EventEmitter();
      const cliReporter = new CliReporter(emitter, {}, {}, true);
      return emitter.emit('start', '', function() {
        assert.isOk(loggerStub.info.calledOnce);
        return done();
      });
    });
  });

  describe('when adding passing test', function() {
    before(() =>
      test = {
        status: 'pass',
        title: 'Passing Test'
      }
    );

    beforeEach(() => sinon.spy(loggerStub, 'pass'));

    afterEach(() => loggerStub.pass.restore());

    it('should write pass to the console', function() {
      const emitter = new EventEmitter();
      const cliReporter = new CliReporter(emitter, {}, {}, true);
      emitter.emit('test pass', test);
      return assert.isOk(loggerStub.pass.calledOnce);
    });

    return describe('when details=true', function() {

      beforeEach(() => sinon.spy(loggerStub, 'request'));

      afterEach(() => loggerStub.request.restore());

      return it('should write details for passing tests', function() {
        const emitter = new EventEmitter();
        const cliReporter = new CliReporter(emitter, {}, {}, true, true);
        emitter.emit('test pass', test);
        return assert.isOk(loggerStub.request.calledOnce);
      });
    });
  });

  describe('when adding failing test', function() {

    before(() =>
      test = {
        status: 'fail',
        title: 'Failing Test'
      }
    );

    describe('when errors are inline', function() {

      beforeEach(() => sinon.spy(loggerStub, 'fail'));

      afterEach(() => loggerStub.fail.restore());

      return it('should write fail to the console', function() {
        const emitter = new EventEmitter();
        const cliReporter = new CliReporter(emitter, {}, {}, true);
        emitter.emit('test fail', test);
        return assert.isOk(loggerStub.fail.calledTwice);
      });
    });

    return describe('when errors are aggregated', function() {

      beforeEach(() => sinon.spy(loggerStub, 'fail'));

      afterEach(() => loggerStub.fail.restore());

      it('should not write full failure to the console at the time of failure', function() {
        const emitter = new EventEmitter();
        const cliReporter = new CliReporter(emitter, {}, {}, false);
        emitter.emit('test fail', test);
        return assert.isOk(loggerStub.fail.calledOnce);
      });

      return it('should write full failure to the console after execution is complete', function(done) {
        const emitter = new EventEmitter();
        const cliReporter = new CliReporter(emitter, {}, {}, false);
        cliReporter.errors = [ test ];
        return emitter.emit('end', function() {
          assert.isOk(loggerStub.fail.calledTwice);
          return done();
        });
      });
    });
  });

  describe('when adding error test', function() {

    before(() =>
      test = {
        status: 'error',
        title: 'Error Test'
      }
    );

    beforeEach(() => sinon.spy(loggerStub, 'error'));

    afterEach(() => loggerStub.error.restore());

    return it('should write error to the console', function() {
      const emitter = new EventEmitter();
      const cliReporter = new CliReporter(emitter, {}, {}, false);
      emitter.emit('test error', new Error('Error'), test);
      return assert.isOk(loggerStub.error.calledTwice);
    });
  });


  describe('when adding error test with connection refused', function() {
    before(() =>
      test = {
        status: 'error',
        title: 'Error Test'
      }
    );

    beforeEach(() => sinon.spy(loggerStub, 'error'));

    afterEach(() => loggerStub.error.restore());

    const connectionErrors = ['ECONNRESET', 'ENOTFOUND', 'ESOCKETTIMEDOUT', 'ETIMEDOUT', 'ECONNREFUSED', 'EHOSTUNREACH', 'EPIPE'];

    return Array.from(connectionErrors).map((errType) => (errType =>
      describe(`when error type ${errType}`, () =>
        it('should write error to the console', function() {
          const emitter = new EventEmitter();
          const cliReporter = new CliReporter(emitter, {}, {}, false);
          const error = new Error('connect');
          error.code = errType;
          emitter.emit('test error', error, test);

          const messages = Object.keys(loggerStub.error.args).map((value, index) => loggerStub.error.args[index][0]);

          return assert.include(messages.join(), 'Error connecting');
        })
      )
    )(errType));
  });

  describe('when adding skipped test', function() {

    before(() =>
      test = {
        status: 'skip',
        title: 'Skipped Test'
      }
    );

    beforeEach(() => sinon.spy(loggerStub, 'skip'));

    afterEach(() => loggerStub.skip.restore());

    return it('should write skip to the console', function() {
      const emitter = new EventEmitter();
      const cliReporter = new CliReporter(emitter, {}, {}, false);
      emitter.emit('test skip', test);
      return assert.isOk(loggerStub.skip.calledOnce);
    });
  });


  return describe('when creating report', function() {

    before(() =>
      test = {
        status: 'fail',
        title: 'Failing Test'
      }
    );

    beforeEach(() => sinon.spy(loggerStub, 'complete'));

    afterEach(() => loggerStub.complete.restore());

    describe('when there is at least one test', () =>

      it('should write to the console', function(done) {
        const emitter = new EventEmitter();
        const cliReporter = new CliReporter(emitter, {}, {}, false);
        cliReporter.tests = [ test ];
        cliReporter.stats.tests = 1;
        return emitter.emit('end', function() {
          assert.isOk(loggerStub.complete.calledTwice);
          return done();
        });
      })
    );

    return describe('when there are no tests', () =>

      it('should write to the console', function(done) {
        const emitter = new EventEmitter();
        const cliReporter = new CliReporter(emitter, {}, {}, false);
        return emitter.emit('end', function() {
          assert.isOk(loggerStub.complete.calledOnce);
          return done();
        });
      })
    );
  });
});








