const proxyquire = require('proxyquire').noCallThru();
const sinon = require('sinon');

const { assert } = require('chai');
const { EventEmitter } = require('events');

const loggerStub = require('../../../lib/logger');

const DotReporter = proxyquire('../../../lib/reporters/DotReporter', {
  '../logger': loggerStub,
});

describe('DotReporter', () => {
  let stats = {};
  let test = [];
  let tests;
  let emitter;
  let dotReporter;

  before(() => { loggerStub.transports.console.silent = true; });

  after(() => { loggerStub.transports.console.silent = false; });

  beforeEach(() => {
    stats = {
      tests: 0,
      failures: 0,
      errors: 0,
      passes: 0,
      skipped: 0,
      start: 0,
      end: 0,
      duration: 0,
    };
    tests = [];
    emitter = new EventEmitter();
    dotReporter = new DotReporter(emitter, stats, tests);
  });

  describe('when starting', () => {
    beforeEach(() => sinon.spy(loggerStub, 'info'));

    afterEach(() => loggerStub.info.restore());

    it('should log that testing has begun', () => emitter.emit('start', '', () => assert.isOk(loggerStub.info.called)));
  });

  describe('when ending', () => {
    beforeEach(() => {
      stats.tests = 1;
      sinon.spy(loggerStub, 'complete');
      sinon.stub(dotReporter, 'write');
    });

    afterEach(() => {
      loggerStub.complete.restore();
      dotReporter.write.restore();
    });

    it('should log that testing is complete', () => emitter.emit('end', () => assert.isOk(loggerStub.complete.calledTwice)));

    describe('when there are failures', () => {
      before(() => {
        test = {
          status: 'fail',
          title: 'failing test',
        };
      });

      beforeEach(() => {
        dotReporter.errors = [test];
        dotReporter.stats.tests = 1;
        emitter.emit('test start', test);
        sinon.spy(loggerStub, 'fail');
      });

      afterEach(() => loggerStub.fail.restore());

      it('should log the failures at the end of testing', done => emitter.emit('end', () => {
        assert.isOk(loggerStub.fail.called);
        done();
      }));
    });
  });

  describe('when test passes', () => {
    before(() => {
      test = {
        status: 'pass',
        title: 'Passing Test',
      };
    });

    beforeEach(() => {
      sinon.stub(dotReporter, 'write');
      emitter.emit('test start', test);
      emitter.emit('test pass', test);
    });

    after(() => dotReporter.write.restore());

    it('should write a .', () => assert.isOk(dotReporter.write.calledWith('.')));
  });

  describe('when test is skipped', () => {
    before(() => {
      test = {
        status: 'skipped',
        title: 'Skipped Test',
      };
    });

    beforeEach(() => {
      sinon.stub(dotReporter, 'write');
      emitter.emit('test start', test);
      emitter.emit('test skip', test);
    });

    after(() => dotReporter.write.restore());

    it('should write a -', () => assert.isOk(dotReporter.write.calledWith('-')));
  });

  describe('when test fails', () => {
    before(() => {
      test = {
        status: 'failed',
        title: 'Failed Test',
      };
    });

    beforeEach(() => {
      sinon.stub(dotReporter, 'write');
      emitter.emit('test start', test);
      emitter.emit('test fail', test);
    });

    after(() => dotReporter.write.restore());

    it('should write an F', () => assert.isOk(dotReporter.write.calledWith('F')));
  });

  describe('when test errors', () => {
    before(() => {
      test = {
        status: 'error',
        title: 'Errored Test',
      };
    });

    beforeEach(() => {
      sinon.stub(dotReporter, 'write');
      emitter.emit('test start', test);
      emitter.emit('test error', new Error('Error'), test);
    });

    after(() => dotReporter.write.restore());

    it('should write an E', () => assert.isOk(dotReporter.write.calledWith('E')));
  });
});
