const fsStub = require('fs');
const proxyquire = require('proxyquire').noCallThru();
const sinon = require('sinon');

const { assert } = require('chai');
const { EventEmitter } = require('events');

const loggerStub = require('../../../lib/logger');

const makeDirStub = (input, options) => makeDirStubImpl(input, options);
let makeDirStubImpl = () => Promise.resolve();
const makeDirStubImplBackup = makeDirStubImpl;

const HTMLReporter = proxyquire('../../../lib/reporters/HTMLReporter', {
  '../logger': loggerStub,
  fs: fsStub,
  'make-dir': makeDirStub,
});

describe('HTMLReporter', () => {
  let emitter;
  let htmlReporter;
  let stats;
  let test = {};
  let tests;

  before(() => { loggerStub.transports.console.silent = true; });

  after(() => { loggerStub.transports.console.silent = false; });

  beforeEach(() => {
    emitter = new EventEmitter();
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
    htmlReporter = new HTMLReporter(emitter, stats, tests, 'test.html');
  });

  describe('when starting', () => {
    describe('when file exists', () => {
      before(() => {
        sinon.stub(fsStub, 'existsSync').callsFake(() => true);
        sinon.stub(loggerStub, 'info');
      });

      after(() => {
        fsStub.existsSync.restore();
        loggerStub.info.restore();
      });

      it('should inform about the existing file', () => assert.isOk(loggerStub.info.called));
    });

    describe('when file does not exist', () => {
      before(() => {
        sinon.stub(fsStub, 'existsSync').callsFake(() => false);
        sinon.stub(fsStub, 'unlinkSync');
      });

      after(() => {
        fsStub.existsSync.restore();
        fsStub.unlinkSync.restore();
      });

      it('should not attempt to delete a file', () => assert.isOk(fsStub.unlinkSync.notCalled));
    });

    it('should write the prelude to the buffer', done => emitter.emit('start', '', () => {
      assert.isOk(htmlReporter.buf.includes('Dredd'));
      done();
    }));
  });

  describe('when ending', () => {
    before(() => { stats.tests = 1; });

    describe('when can create output directory', () => {
      beforeEach(() => {
        sinon.stub(fsStub, 'writeFile').callsFake((path, data, callback) => callback());
        makeDirStubImpl = sinon.spy(makeDirStubImpl);
      });

      afterEach(() => {
        fsStub.writeFile.restore();
        makeDirStubImpl = makeDirStubImplBackup;
      });

      it('should write the file', done => emitter.emit('end', () => {
        assert.isOk(makeDirStubImpl.called);
        assert.isOk(fsStub.writeFile.called);
        done();
      }));
    });

    describe('when cannot create output directory', () => {
      beforeEach(() => {
        sinon.stub(loggerStub, 'error');
        sinon.stub(fsStub, 'writeFile').callsFake((path, data, callback) => callback());
        makeDirStubImpl = sinon.stub().callsFake(() => Promise.reject(new Error()));
      });

      after(() => {
        loggerStub.error.restore();
        fsStub.writeFile.restore();
        makeDirStubImpl = makeDirStubImplBackup;
      });

      it('should write to log', done => emitter.emit('end', () => {
        assert.isOk(makeDirStubImpl.called);
        assert.isOk(fsStub.writeFile.notCalled);
        assert.isOk(loggerStub.error.called);
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

    it('should call the pass event', () => {
      emitter.emit('test start', test);
      emitter.emit('test pass', test);
      assert.isOk(htmlReporter.buf.includes('Pass'));
    });

    describe('when details=true', () => it('should write details for passing tests', () => {
      htmlReporter.details = true;
      emitter.emit('test pass', test);
      assert.isOk(htmlReporter.buf.includes('Request'));
    }));
  });

  describe('when test is skipped', () => {
    before(() => {
      test = {
        status: 'skipped',
        title: 'Skipped Test',
      };
    });

    it('should call the skip event', () => {
      emitter.emit('test start', test);
      emitter.emit('test skip', test);
      assert.isOk(htmlReporter.buf.includes('Skip'));
    });
  });

  describe('when test fails', () => {
    before(() => {
      test = {
        status: 'failed',
        title: 'Failed Test',
      };
    });

    it('should call the fail event', () => {
      emitter.emit('test start', test);
      emitter.emit('test fail', test);
      assert.isOk(htmlReporter.buf.includes('Fail'));
    });
  });

  describe('when test errors', () => {
    before(() => {
      test = {
        status: 'error',
        title: 'Errored Test',
      };
    });

    it('should call the error event', () => {
      emitter.emit('test start', test);
      emitter.emit('test error', new Error('Error'), test);
      assert.isOk(htmlReporter.buf.includes('Error'));
    });
  });
});
