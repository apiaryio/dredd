const {EventEmitter} = require('events');
const {assert} = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

const loggerStub = require('../../../src/logger');
const fsStub = require('fs');
const fsExtraStub = {mkdirp(path, cb) { return cb(); }};

const XUnitReporter = proxyquire('../../../src/reporters/x-unit-reporter', {
  './../logger' : loggerStub,
  'fs' : fsStub,
  'fs-extra' : fsExtraStub
});


describe('XUnitReporter', function() {

  let test = {};

  before(() => loggerStub.transports.console.silent = true);

  after(() => loggerStub.transports.console.silent = false);

  describe('when creating', function() {

    describe('when file exists', function() {
      before(function() {
        sinon.stub(fsStub, 'existsSync').callsFake(path => true);
        sinon.stub(fsStub, 'unlinkSync').callsFake(path => true);
        return sinon.stub(loggerStub, 'info');
      });

      after(function() {
        fsStub.existsSync.restore();
        fsStub.unlinkSync.restore();
        return loggerStub.info.restore();
      });

      return it('should inform about the existing file', function() {
        const emitter = new EventEmitter();
        const xUnitReporter = new XUnitReporter(emitter, {}, {}, "test.xml");
        return assert.isOk(loggerStub.info.called);
      });
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

      return it('should create the file', function() {
        const emitter = new EventEmitter();
        const xUnitReporter = new XUnitReporter(emitter, {}, {}, "test.xml");
        return assert.isOk(fsStub.unlinkSync.notCalled);
      });
    });
  });

  describe('when starting', function() {

    describe('when can create output directory', function() {

      beforeEach(function() {
        sinon.stub(fsStub, 'appendFileSync');
        return sinon.spy(fsExtraStub, 'mkdirp');
      });

      afterEach(function() {
        fsStub.appendFileSync.restore();
        return fsExtraStub.mkdirp.restore();
      });

      return it('should write opening to file', function(done) {
        const emitter = new EventEmitter();
        const xUnitReporter = new XUnitReporter(emitter, {}, {}, "test.xml");
        return emitter.emit('start', '', function() {
          assert.isOk(fsExtraStub.mkdirp.called);
          assert.isOk(fsStub.appendFileSync.called);
          return done();
        });
      });
    });

    return describe('when cannot create output directory', function() {

      beforeEach(function() {
        sinon.stub(fsStub, 'appendFileSync');
        sinon.stub(loggerStub, 'error');
        return sinon.stub(fsExtraStub, 'mkdirp').callsFake((path, cb) => cb('error'));
      });

      after(function() {
        fsStub.appendFileSync.restore();
        loggerStub.error.restore();
        return fsExtraStub.mkdirp.restore();
      });

      return it('should write to log', function(done) {
        const emitter = new EventEmitter();
        const xUnitReporter = new XUnitReporter(emitter, {}, {}, "test.xml");
        return emitter.emit('start', '', function() {
          assert.isOk(fsExtraStub.mkdirp.called);
          assert.isOk(fsStub.appendFileSync.notCalled);
          assert.isOk(loggerStub.error.called);
          return done();
        });
      });
    });
  });

  describe('when ending', function() {

    beforeEach(function() {
      sinon.stub(fsStub, 'appendFileSync');
      sinon.stub(fsStub, 'readFile');
      fsStub.readFile.yields(null, 'da\nta');
      sinon.stub(fsStub, 'writeFile');
      return fsStub.writeFile.yields(null);
    });

    afterEach(function() {
      fsStub.appendFileSync.restore();
      fsStub.readFile.restore();
      return fsStub.writeFile.restore();
    });

    describe('when there is one test', function() {

      it('should write tests to file', function() {
        const emitter = new EventEmitter();
        const xUnitReporter = new XUnitReporter(emitter, {}, {});
        xUnitReporter.tests = [ test ];
        xUnitReporter.stats.tests = 1;
        emitter.emit('test pass', test);
        return assert.isOk(fsStub.appendFileSync.called);
      });

      return describe('when the file writes successfully', () =>

        it('should read the file and update the stats', function(done) {
          const emitter = new EventEmitter();
          const xUnitReporter = new XUnitReporter(emitter, {}, {});
          xUnitReporter.tests = [ test ];
          xUnitReporter.stats.tests = 1;

          return emitter.emit('end', function() {
            assert.isOk(fsStub.writeFile.called);
            return done();
          });
        })
      );
    });

    return describe('when there are no tests', () =>

      it('should write empty suite', function(done) {
        const emitter = new EventEmitter();
        const xUnitReporter = new XUnitReporter(emitter, {}, {});
        return emitter.emit('end', function() {
          assert.isOk(fsStub.writeFile.called);
          return done();
        });
      })
    );
  });

  describe('when test passes', function() {

    before(() =>
      test = {
        status: 'pass',
        title: 'Passing Test',
        request: {
          body: '{ "test": "body" }',
          schema: '{ "test": "schema" }',
          headers: {
            'Accept': 'application/json'
          }
        },
        expected: {
          body: '{ "test": "body" }',
          schema: '{ "test": "schema" }',
          headers: {
            'Content-Type': 'application/json'
          }
        },
        actual: {
          body: '<html></html>',
          headers: {
            'Content-Type': 'text/html'
          }
        }
      }
    );

    beforeEach(() => sinon.stub(fsStub, 'appendFileSync'));

    afterEach(() => fsStub.appendFileSync.restore());

    it('should write a passing test', function() {
      const emitter = new EventEmitter();
      const xUnitReporter = new XUnitReporter(emitter, {}, {}, "test.xml");
      emitter.emit('test start', test);
      emitter.emit('test pass', test);
      return assert.isOk(fsStub.appendFileSync.called);
    });

    return describe('when details=true', () =>

      it('should write details for passing tests', function() {
        const emitter = new EventEmitter();
        const cliReporter = new XUnitReporter(emitter, {}, {}, "test.xml", true);
        emitter.emit('test start', test);
        emitter.emit('test pass', test);
        return assert.isOk(fsStub.appendFileSync.called);
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

    beforeEach(() => sinon.stub(fsStub, 'appendFileSync'));

    afterEach(() => fsStub.appendFileSync.restore());

    return it('should write a skipped test', function() {
      const emitter = new EventEmitter();
      const xUnitReporter = new XUnitReporter(emitter, {}, {}, "test.xml");
      emitter.emit('test start', test);
      emitter.emit('test skip', test);
      return assert.isOk(fsStub.appendFileSync.called);
    });
  });

  describe('when test fails', function() {

    before(() =>
      test = {
        status: 'failed',
        title: 'Failed Test'
      }
    );

    beforeEach(() => sinon.stub(fsStub, 'appendFileSync'));

    afterEach(() => fsStub.appendFileSync.restore());

    return it('should write a failed test', function() {
      const emitter = new EventEmitter();
      const xUnitReporter = new XUnitReporter(emitter, {}, {}, "test.xml");
      emitter.emit('test start', test);
      emitter.emit('test fail', test);
      return assert.isOk(fsStub.appendFileSync.called);
    });
  });

  return describe('when test errors', function() {

    before(() =>
      test = {
        status: 'error',
        title: 'Errored Test'
      }
    );

    beforeEach(() => sinon.stub(fsStub, 'appendFileSync'));

    afterEach(() => fsStub.appendFileSync.restore());

    return it('should write an error test', function() {
      const emitter = new EventEmitter();
      const xUnitReporter = new XUnitReporter(emitter, {}, {}, "test.xml");
      emitter.emit('test start', test);
      emitter.emit('test error', new Error('Error'), test);
      return assert.isOk(fsStub.appendFileSync.called);
    });
  });
});
