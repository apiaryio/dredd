const {assert} = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

const {EventEmitter} = require('events');
const loggerStub = require('../../../src/logger');
const fsStub = require('fs');
const fsExtraStub = {mkdirp(path, cb) { return cb(); }};

const HtmlReporter = proxyquire('../../../src/reporters/html-reporter', {
  './../logger' : loggerStub,
  'fs' : fsStub,
  'fs-extra' : fsExtraStub
});


describe('HtmlReporter', function() {

  let test = {};
  let emitter = {};
  let stats = {};
  let tests = [];
  let htmlReporter = {};

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
    return htmlReporter = new HtmlReporter(emitter, stats, tests, "test.html");
  });

  describe('when starting', function() {

    describe('when file exists', function() {
      before(function() {
        sinon.stub(fsStub, 'existsSync').callsFake(path => true);
        return sinon.stub(loggerStub, 'info');
      });

      after(function() {
        fsStub.existsSync.restore();
        return loggerStub.info.restore();
      });

      return it('should inform about the existing file', () => assert.isOk(loggerStub.info.called));
    });

    describe('when file does not exist', function() {

      before(function() {
        sinon.stub(fsStub, 'existsSync').callsFake(path => false);
        return sinon.stub(fsStub, 'unlinkSync');
      });

      after(function() {
        fsStub.existsSync.restore();
        return fsStub.unlinkSync.restore();
      });

      return it('should not attempt to delete a file', () => assert.isOk(fsStub.unlinkSync.notCalled));
    });

    return it('should write the prelude to the buffer', done =>
      emitter.emit('start', '' , function() {
        assert.isOk(~htmlReporter.buf.indexOf('Dredd'));
        return done();
      })
    );
  });

  describe('when ending', function() {

    before(() => stats.tests = 1);

    describe('when can create output directory', function() {

      beforeEach(function() {
        sinon.stub(fsStub, 'writeFile').callsFake((path, data, callback) => callback());
        return sinon.spy(fsExtraStub, 'mkdirp');
      });

      afterEach(function() {
        fsStub.writeFile.restore();
        return fsExtraStub.mkdirp.restore();
      });

      return it('should write the file', done =>
        emitter.emit('end', function() {
          assert.isOk(fsExtraStub.mkdirp.called);
          assert.isOk(fsStub.writeFile.called);
          return done();
        })
      );
    });

    return describe('when cannot create output directory', function() {

      beforeEach(function() {
        sinon.stub(loggerStub, 'error');
        sinon.stub(fsStub, 'writeFile').callsFake((path, data, callback) => callback());
        return sinon.stub(fsExtraStub, 'mkdirp').callsFake((path, cb) => cb('error'));
      });

      after(function() {
        loggerStub.error.restore();
        fsStub.writeFile.restore();
        return fsExtraStub.mkdirp.restore();
      });

      return it('should write to log', done =>
        emitter.emit('end', function() {
          assert.isOk(fsExtraStub.mkdirp.called);
          assert.isOk(fsStub.writeFile.notCalled);
          assert.isOk(loggerStub.error.called);
          return done();
        })
      );
    });
  });

  describe('when test passes', function() {

    before(() =>
      test = {
        status: 'pass',
        title: 'Passing Test'
      }
    );

    it('should call the pass event', function() {
      emitter.emit('test start', test);
      emitter.emit('test pass', test);
      return assert.isOk(~htmlReporter.buf.indexOf('Pass'));
    });

    return describe('when details=true', () =>

      it('should write details for passing tests', function() {
        htmlReporter.details = true;
        emitter.emit('test pass', test);
        return assert.isOk(~htmlReporter.buf.indexOf('Request'));
      })
    );
  });

  describe('when test is skipped', function() {
    before(() =>
      test = {
        status: 'skipped',
        title: 'Skipped Test'
      }
    );

    return it('should call the skip event', function() {
      emitter.emit('test start', test);
      emitter.emit('test skip', test);
      return assert.isOk(~htmlReporter.buf.indexOf('Skip'));
    });
  });

  describe('when test fails', function() {

    before(() =>
      test = {
        status: 'failed',
        title: 'Failed Test'
      }
    );

    return it('should call the fail event', function() {
      emitter.emit('test start', test);
      emitter.emit('test fail', test);
      return assert.isOk(~htmlReporter.buf.indexOf('Fail'));
    });
  });

  return describe('when test errors', function() {

    before(() =>
      test = {
        status: 'error',
        title: 'Errored Test'
      }
    );

    return it('should call the error event', function() {
      emitter.emit('test start', test);
      emitter.emit('test error', new Error('Error'), test);
      return assert.isOk(~htmlReporter.buf.indexOf('Error'));
    });
  });
});
