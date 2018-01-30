/* eslint-disable
    no-return-assign,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
const { assert } = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

const { EventEmitter } = require('events');
const loggerStub = require('../../../src/logger');

const DotReporter = proxyquire('../../../src/reporters/dot-reporter', {
  './../logger': loggerStub
});

describe('DotReporter', () => {
  let stats = {};
  let test = [];
  let emitter = {};
  let dotReporter = {};

  before(() => loggerStub.transports.console.silent = true);

  after(() => loggerStub.transports.console.silent = false);

  beforeEach(() => {
    stats = {
      tests: 0,
      failures: 0,
      errors: 0,
      passes: 0,
      skipped: 0,
      start: 0,
      end: 0,
      duration: 0
    };
    const tests = [];
    emitter = new EventEmitter();
    return dotReporter = new DotReporter(emitter, stats, tests);
  });

  describe('when starting', () => {
    beforeEach(() => sinon.spy(loggerStub, 'info'));

    afterEach(() => loggerStub.info.restore());

    return it('should log that testing has begun', () =>
      emitter.emit('start', '', () => assert.isOk(loggerStub.info.called))
    );
  });

  describe('when ending', () => {
    beforeEach(() => {
      stats.tests = 1;
      sinon.spy(loggerStub, 'complete');
      return sinon.stub(dotReporter, 'write');
    });

    afterEach(() => {
      loggerStub.complete.restore();
      return dotReporter.write.restore();
    });

    it('should log that testing is complete', () =>
      emitter.emit('end', () => assert.isOk(loggerStub.complete.calledTwice))
    );

    return describe('when there are failures', () => {
      before(() =>
        test = {
          status: 'fail',
          title: 'failing test'
        }
      );

      beforeEach(() => {
        dotReporter.errors = [test];
        dotReporter.stats.tests = 1;
        emitter.emit('test start', test);
        return sinon.spy(loggerStub, 'fail');
      });

      afterEach(() => loggerStub.fail.restore());

      return it('should log the failures at the end of testing', done =>
        emitter.emit('end', () => {
          assert.isOk(loggerStub.fail.called);
          return done();
        })
      );
    });
  });

  describe('when test passes', () => {
    before(() =>
      test = {
        status: 'pass',
        title: 'Passing Test'
      }
    );

    beforeEach(() => {
      sinon.stub(dotReporter, 'write');
      emitter.emit('test start', test);
      return emitter.emit('test pass', test);
    });

    after(() => dotReporter.write.restore());

    return it('should write a .', () => assert.isOk(dotReporter.write.calledWith('.')));
  });

  describe('when test is skipped', () => {
    before(() =>
      test = {
        status: 'skipped',
        title: 'Skipped Test'
      }
    );

    beforeEach(() => {
      sinon.stub(dotReporter, 'write');
      emitter.emit('test start', test);
      return emitter.emit('test skip', test);
    });

    after(() => dotReporter.write.restore());

    return it('should write a -', () => assert.isOk(dotReporter.write.calledWith('-')));
  });

  describe('when test fails', () => {
    before(() =>
      test = {
        status: 'failed',
        title: 'Failed Test'
      }
    );

    beforeEach(() => {
      sinon.stub(dotReporter, 'write');
      emitter.emit('test start', test);
      return emitter.emit('test fail', test);
    });

    after(() => dotReporter.write.restore());

    return it('should write an F', () => assert.isOk(dotReporter.write.calledWith('F')));
  });

  return describe('when test errors', () => {
    before(() =>
      test = {
        status: 'error',
        title: 'Errored Test'
      }
    );

    beforeEach(() => {
      sinon.stub(dotReporter, 'write');
      emitter.emit('test start', test);
      return emitter.emit('test error', new Error('Error'), test);
    });

    after(() => dotReporter.write.restore());

    return it('should write an E', () => assert.isOk(dotReporter.write.calledWith('E')));
  });
});
