const {assert} = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

const {EventEmitter} = require('events');
const loggerStub = require('../../../src/logger');
const fsStub = require('fs');
const fsExtraStub = {mkdirp(path, cb) { return cb(); }};

const MarkdownReporter = proxyquire('../../../src/reporters/markdown-reporter', {
  './../logger' : loggerStub,
  'fs' : fsStub,
  'fs-extra' : fsExtraStub
});


describe('MarkdownReporter', function() {

  let test = {};
  let emitter = {};
  let stats = {};
  let tests = [];
  let mdReporter = {};

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
    return mdReporter = new MarkdownReporter(emitter, stats, tests, "test.md");
  });


  describe('when creating', function() {

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

    return describe('when file does not exist', function() {

      before(function() {
        sinon.stub(fsStub, 'existsSync').callsFake(path => false);
        return sinon.stub(fsStub, 'unlinkSync');
      });

      after(function() {
        fsStub.existsSync.restore();
        return fsStub.unlinkSync.restore();
      });

      return it('should create the file', function(done) {
        assert.isOk(fsStub.unlinkSync.notCalled);
        return done();
      });
    });
  });

  describe('when starting', () =>

    it('should write the title to the buffer', done =>
      emitter.emit('start', '', function() {
        assert.isOk(~mdReporter.buf.indexOf('Dredd'));
        return done();
      })
    )
  );

  describe('when ending', function() {

    describe('when can create output directory', function() {

      beforeEach(function() {
        sinon.stub(fsStub, 'writeFile');
        return sinon.spy(fsExtraStub, 'mkdirp');
      });

      afterEach(function() {
        fsStub.writeFile.restore();
        return fsExtraStub.mkdirp.restore();
      });

      return it('should write buffer to file', function(done) {
        emitter.emit('end');
        assert.isOk(fsExtraStub.mkdirp.called);
        assert.isOk(fsStub.writeFile.called);
        return done();
      });
    });

    return describe('when cannot create output directory', function() {

      beforeEach(function() {
        sinon.stub(fsStub, 'writeFile');
        sinon.stub(loggerStub, 'error');
        return sinon.stub(fsExtraStub, 'mkdirp').callsFake((path, cb) => cb('error'));
      });

      after(function() {
        fsStub.writeFile.restore();
        loggerStub.error.restore();
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

    beforeEach(function() {
      test = {
        status: 'pass',
        title: 'Passing Test'
      };
      emitter.emit('test start', test);
      return emitter.emit('test pass', test);
    });

    it('should write pass to the buffer', function(done) {
      assert.isOk(~mdReporter.buf.indexOf('Pass'));
      return done();
    });

    return describe('when details=true', () =>

      it('should write details for passing tests', function(done) {
        mdReporter.details = true;
        emitter.emit('test pass', test);
        assert.isOk(~mdReporter.buf.indexOf('Request'));
        return done();
      })
    );
  });

  describe('when test is skipped', function() {
    beforeEach(function() {
      test = {
        status: 'skipped',
        title: 'Skipped Test'
      };
      emitter.emit('test start', test);
      return emitter.emit('test skip', test);
    });

    return it('should write skip to the buffer', function(done) {
      assert.isOk(~mdReporter.buf.indexOf('Skip'));
      return done();
    });
  });

  describe('when test fails', function() {

    beforeEach(function() {
      test = {
        status: 'failed',
        title: 'Failed Test'
      };
      emitter.emit('test start', test);
      return emitter.emit('test fail', test);
    });

    return it('should write fail to the buffer', function(done) {
      assert.isOk(~mdReporter.buf.indexOf('Fail'));
      return done();
    });
  });

  return describe('when test errors', function() {

    beforeEach(function() {
      test = {
        status: 'error',
        title: 'Errored Test'
      };
      emitter.emit('test start', test);
      return emitter.emit('test error', new Error('Error'), test);
    });

    return it('should write error to the buffer', function(done) {
      assert.isOk(~mdReporter.buf.indexOf('Error'));
      return done();
    });
  });
});
