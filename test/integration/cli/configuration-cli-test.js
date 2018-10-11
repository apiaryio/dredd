const express = require('express');
const fs = require('fs');
const proxyquire = require('proxyquire').noCallThru();
const sinon = require('sinon');
const { assert } = require('chai');

const loggerStub = require('../../../src/logger');
const configUtils = require('../../../src/config-utils');

const PORT = 9876;

let exitStatus;

let stderr = '';
let stdout = '';

const addHooksStub = proxyquire('../../../src/add-hooks', {
  './logger': loggerStub
});

const transactionRunner = proxyquire('../../../src/transaction-runner', {
  './add-hooks': addHooksStub,
  './logger': loggerStub
});

const dreddStub = proxyquire('../../../src/dredd', {
  './transaction-runner': transactionRunner,
  './logger': loggerStub
});

const CLIStub = proxyquire('../../../src/cli', {
  './dredd': dreddStub,
  './config-utils': configUtils,
  console: loggerStub,
  fs
});

function execCommand(custom = {}, cb) {
  stdout = '';
  stderr = '';
  exitStatus = null;
  let finished = false;
  const cli = new CLIStub({ custom }, ((exitStatusCode) => {
    if (!finished) {
      finished = true;
      exitStatus = (exitStatusCode != null ? exitStatusCode : 0);
      cb(null, stdout, stderr, (exitStatusCode != null ? exitStatusCode : 0));
    }
  }));

  cli.run();
}

describe('CLI class Integration', () => {
  before(() => {
    ['warn', 'error'].forEach((method) => {
      sinon.stub(loggerStub, method).callsFake((chunk) => { stderr += `\n${method}: ${chunk}`; });
    });
    [
      'log', 'info', 'silly', 'verbose', 'test',
      'hook', 'complete', 'pass', 'skip', 'debug',
      'fail', 'request', 'expected', 'actual'
    ].forEach((method) => {
      sinon.stub(loggerStub, method).callsFake((chunk) => { stdout += `\n${method}: ${chunk}`; });
    });
  });

  after(() => {
    ['warn', 'error'].forEach((method) => { loggerStub[method].restore(); });

    [
      'log', 'info', 'silly', 'verbose', 'test',
      'hook', 'complete', 'pass', 'skip', 'debug',
      'fail', 'request', 'expected', 'actual'
    ].forEach((method) => { loggerStub[method].restore(); });
  });

  describe('When using configuration file', () => {
    describe('When specifying custom configuration file by --config', () => {
      const configPath = '../../../custom-dredd-config-path.yaml';
      const cmd = { argv: ['--config', configPath] };
      const options = { _: ['api-description.apib', 'http://127.0.0.1'] };

      let fsExistsSync;
      let configUtilsLoad;

      before((done) => {
        fsExistsSync = sinon.stub(fs, 'existsSync').callsFake(() => true);
        configUtilsLoad = sinon.stub(configUtils, 'load').callsFake(() => options);
        execCommand(cmd, done);
      });
      after(() => {
        fsExistsSync.restore();
        configUtilsLoad.restore();
      });

      it('should call fs.existsSync with given path', () => assert.isTrue(fsExistsSync.calledWith(configPath)));
      it('should call configUtils.load with given path', () => assert.isTrue(configUtilsLoad.calledWith(configPath)));
      it('should print message about using given configuration file', () => assert.include(stdout, `info: Configuration '${configPath}' found`));
    });

    describe('When dredd.yml exists', () => {
      const configPath = './dredd.yml';
      const cmd = { argv: [] };
      const options = { _: ['api-description.apib', 'http://127.0.0.1'] };

      let fsExistsSync;
      let configUtilsLoad;

      before((done) => {
        fsExistsSync = sinon.stub(fs, 'existsSync').callsFake(() => true);
        configUtilsLoad = sinon.stub(configUtils, 'load').callsFake(() => options);
        execCommand(cmd, done);
      });
      after(() => {
        fsExistsSync.restore();
        configUtilsLoad.restore();
      });

      it('should call fs.existsSync with dredd.yml', () => assert.isTrue(fsExistsSync.calledWith(configPath)));
      it('should call configUtils.load with dredd.yml', () => assert.isTrue(configUtilsLoad.calledWith(configPath)));
      it('should print message about using dredd.yml', () => assert.include(stdout, `info: Configuration '${configPath}' found`));
    });

    describe('When dredd.yml does not exist', () => {
      const configPath = './dredd.yml';
      const cmd = { argv: [] };

      let fsExistsSync;
      let configUtilsLoad;

      before((done) => {
        fsExistsSync = sinon.stub(fs, 'existsSync').callsFake(() => false);
        configUtilsLoad = sinon.spy(configUtils, 'load');
        execCommand(cmd, done);
      });
      after(() => {
        fsExistsSync.restore();
        configUtilsLoad.restore();
      });

      it('should call fs.existsSync with dredd.yml', () => assert.isTrue(fsExistsSync.calledWith(configPath)));
      it('should never call configUtils.load', () => assert.isFalse(configUtilsLoad.called));
      it('should not print message about using configuration file', () => assert.notInclude(stdout, 'info: Configuration'));
    });
  });

  describe("to test various Errors - When API description document should be loaded from 'http(s)://...' url", () => {
    let app = null;
    let server = null;

    const errorCmd = {
      argv: [
        `http://127.0.0.1:${PORT + 1}/connection-error.apib`,
        `http://127.0.0.1:${PORT + 1}`
      ]
    };
    const wrongCmd = {
      argv: [
        `http://127.0.0.1:${PORT}/not-found.apib`,
        `http://127.0.0.1:${PORT}`
      ]
    };
    const goodCmd = {
      argv: [
        `http://127.0.0.1:${PORT}/file.apib`,
        `http://127.0.0.1:${PORT}`
      ]
    };

    before((done) => {
      app = express();

      app.get('/', (req, res) => res.sendStatus(404));

      app.get('/file.apib', (req, res) => {
        fs.createReadStream('./test/fixtures/single-get.apib').pipe(res.type('text'));
      });

      app.get('/machines', (req, res) => res.json([{ type: 'bulldozer', name: 'willy' }]));

      app.get('/not-found.apib', (req, res) => res.status(404).end());

      server = app.listen(PORT, () => done());
    });

    after(done => server.close(() => {
      app = null;
      server = null;
      done();
    }));

    describe('and I try to load a file from bad hostname at all', () => {
      before(done => execCommand(errorCmd, () => done()));

      it('should exit with status 1', () => assert.equal(exitStatus, 1));

      it('should print error message to stderr', () => {
        assert.include(stderr, 'Error when loading file from URL');
        assert.include(stderr, 'Is the provided URL correct?');
        assert.include(stderr, 'connection-error.apib');
      });
    });

    describe('and I try to load a file that does not exist from an existing server', () => {
      before(done => execCommand(wrongCmd, () => done()));

      it('should exit with status 1', () => assert.equal(exitStatus, 1));

      it('should print error message to stderr', () => {
        assert.include(stderr, 'Unable to load file from URL');
        assert.include(stderr, 'responded with status code 404');
        assert.include(stderr, 'not-found.apib');
      });
    });

    describe('and I try to load a file that actually is there', () => {
      before(done => execCommand(goodCmd, () => done()));

      it('should exit with status 0', () => assert.equal(exitStatus, 0));
    });
  });
});
