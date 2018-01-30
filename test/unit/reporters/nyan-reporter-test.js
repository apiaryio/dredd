const {assert} = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

const {EventEmitter} = require('events');
const loggerStub = require('../../../src/logger');
const NyanCatReporter = proxyquire('../../../src/reporters/nyan-reporter', {
  './../logger' : loggerStub
});

describe('NyanCatReporter', function() {

  let emitter = {};
  let stats = {};
  let tests = [];
  let nyanReporter = {};

  before(() => loggerStub.transports.console.silent = true);

  after(() => loggerStub.transports.console.silent = false);

  beforeEach(function() {
    emitter = new EventEmitter();
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
    tests = [];
    return nyanReporter = new NyanCatReporter(emitter, stats, tests);
  });

  describe('when starting', function() {

    beforeEach(function() {
      sinon.spy(nyanReporter, 'cursorHide');
      sinon.spy(nyanReporter, 'draw');
      return sinon.stub(nyanReporter, 'write');
    });

    afterEach(function() {
      nyanReporter.cursorHide.restore();
      nyanReporter.draw.restore();
      return nyanReporter.write.restore();
    });

    return it('should hide the cursor and draw the cat', done =>
      emitter.emit('start', '', function() {
        assert.isOk(nyanReporter.cursorHide.calledOnce);
        assert.isOk(nyanReporter.draw.calledOnce);
        return done();
      })
    );
  });

  describe('when ending', function() {

    beforeEach(function() {
      sinon.spy(loggerStub, 'complete');
      sinon.spy(nyanReporter, 'draw');
      return sinon.stub(nyanReporter, 'write');
    });

    afterEach(function() {
      loggerStub.complete.restore();
      nyanReporter.draw.restore();
      return nyanReporter.write.restore();
    });

    it('should log that testing is complete', done =>
      emitter.emit('end', function() {
        assert.isOk(loggerStub.complete.calledTwice);
        return done();
      })
    );

    return describe('when there are failures', function() {

      beforeEach(function() {
        const test = {
          status: 'fail',
          title: 'failing test'
        };
        nyanReporter.errors = [test];
        emitter.emit('test start', test);
        return sinon.spy(loggerStub, 'fail');
      });

      afterEach(() => loggerStub.fail.restore());

      return it('should log the failures at the end of testing', done =>
        emitter.emit('end', function(){
          assert.isOk(loggerStub.fail.calledTwice);
          return done();
        })
      );
    });
  });

  return describe('when test finished', function() {

    describe('when test passes', function() {

      beforeEach(function() {
        const test = {
          status: 'pass',
          title: 'Passing Test'
        };
        sinon.stub(nyanReporter, 'write');
        sinon.spy(nyanReporter, 'draw');
        return emitter.emit('test pass', test);
      });

      afterEach(function() {
        nyanReporter.draw.restore();
        return nyanReporter.write.restore();
      });

      return it('should draw the cat', () => assert.isOk(nyanReporter.draw.calledOnce));
    });

    describe('when test is skipped', function() {
      beforeEach(function() {
        const test = {
          status: 'skipped',
          title: 'Skipped Test'
        };
        sinon.spy(nyanReporter, 'draw');
        sinon.stub(nyanReporter, 'write');
        return emitter.emit('test skip', test);
      });

      afterEach(function() {
        nyanReporter.draw.restore();
        return nyanReporter.write.restore();
      });

      return it('should draw the cat', () => assert.isOk(nyanReporter.draw.calledOnce));
    });

    describe('when test fails', function() {

      beforeEach(function() {
        const test = {
          status: 'failed',
          title: 'Failed Test'
        };
        sinon.spy(nyanReporter, 'draw');
        sinon.stub(nyanReporter, 'write');
        return emitter.emit('test fail', test);
      });

      afterEach(function() {
        nyanReporter.draw.restore();
        return nyanReporter.write.restore();
      });

      return it('should draw the cat', () => assert.isOk(nyanReporter.draw.calledOnce));
    });

    return describe('when test errors', function() {

      beforeEach(function() {
        const test = {
          status: 'error',
          title: 'Errored Test'
        };
        sinon.spy(nyanReporter, 'draw');
        sinon.stub(nyanReporter, 'write');
        return emitter.emit('test error', new Error('Error'), test);
      });

      afterEach(function() {
        nyanReporter.write.restore();
        return nyanReporter.draw.restore();
      });

      return it('should draw the cat', () => assert.isOk(nyanReporter.draw.calledOnce));
    });
  });
});

