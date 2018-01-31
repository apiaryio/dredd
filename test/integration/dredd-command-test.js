/* eslint-disable
    block-scoped-var,
    no-loop-func,
    no-return-assign,
    no-shadow,
    no-unused-vars,
    no-var,
    vars-on-top,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
const { assert } = require('chai');
const sinon = require('sinon');
const express = require('express');
const clone = require('clone');
const fs = require('fs');
const bodyParser = require('body-parser');

const proxyquire = require('proxyquire').noCallThru();

const loggerStub = require('../../src/logger');
const configUtils = require('../../src/config-utils');

const PORT = 9876;

let exitStatus = null;

let stderr = '';
let stdout = '';

const addHooksStub = proxyquire('../../src/add-hooks', {
  './logger': loggerStub
});
const transactionRunner = proxyquire('../../src/transaction-runner', {
  './add-hooks': addHooksStub,
  './logger': loggerStub
});
const dreddStub = proxyquire('../../src/dredd', {
  './transaction-runner': transactionRunner,
  './logger': loggerStub
});
const DreddCommand = proxyquire('../../src/dredd-command', {
  './dredd': dreddStub,
  './config-utils': configUtils,
  console: loggerStub,
  fs
});

const execCommand = function (custom = {}, cb) {
  stdout = '';
  stderr = '';
  exitStatus = null;
  let finished = false;
  const dreddCommand = new DreddCommand({ custom }, ((exitStatusCode) => {
    if (!finished) {
      finished = true;
      exitStatus = (exitStatusCode != null ? exitStatusCode : 0);
      return cb(null, stdout, stderr, (exitStatusCode != null ? exitStatusCode : 0));
    }
  }));


  dreddCommand.run();
};

describe('DreddCommand class Integration', () => {
  const dreddCommand = null;
  const custom = {};

  before(() => {
    for (var method of ['warn', 'error']) { (method => sinon.stub(loggerStub, method).callsFake(chunk => stderr += `\n${method}: ${chunk}`))(method); }
    for (method of ['log', 'info', 'silly', 'verbose', 'test', 'hook', 'complete', 'pass', 'skip', 'debug', 'fail', 'request', 'expected', 'actual']) { (method => sinon.stub(loggerStub, method).callsFake(chunk => stdout += `\n${method}: ${chunk}`))(method); }
  });

  after(() => {
    for (var method of ['warn', 'error']) {
      loggerStub[method].restore();
    }
    for (method of ['log', 'info', 'silly', 'verbose', 'test', 'hook', 'complete', 'pass', 'skip', 'debug', 'fail', 'request', 'expected', 'actual']) {
      loggerStub[method].restore();
    }
  });

  describe('When using configuration file', () => {
    describe('When specifying custom configuration file by --config', () => {
      const configPath = '../../custom-dredd-config-path.yaml';
      const cmd = { argv: ['--config', configPath] };
      const options = { _: ['api-description.apib', 'http://127.0.0.1'] };

      let fsExistsSync;
      let configUtilsLoad;

      before((done) => {
        fsExistsSync = sinon.stub(fs, 'existsSync').callsFake(() => true);
        configUtilsLoad = sinon.stub(configUtils, 'load').callsFake(() => options);
        return execCommand(cmd, done);
      });
      after(() => {
        fsExistsSync.restore();
        return configUtilsLoad.restore();
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
        return execCommand(cmd, done);
      });
      after(() => {
        fsExistsSync.restore();
        return configUtilsLoad.restore();
      });

      it('should call fs.existsSync with dredd.yml', () => assert.isTrue(fsExistsSync.calledWith(configPath)));
      it('should call configUtils.load with dredd.yml', () => assert.isTrue(configUtilsLoad.calledWith(configPath)));
      it('should print message about using dredd.yml', () => assert.include(stdout, `info: Configuration '${configPath}' found`));
    });

    describe('When dredd.yml does not exist', () => {
      const configPath = './dredd.yml';
      const cmd = { argv: [] };
      const options = { _: ['api-description.apib', 'http://127.0.0.1'] };

      let fsExistsSync;
      let configUtilsLoad;

      before((done) => {
        fsExistsSync = sinon.stub(fs, 'existsSync').callsFake(() => false);
        configUtilsLoad = sinon.spy(configUtils, 'load');
        return execCommand(cmd, done);
      });
      after(() => {
        fsExistsSync.restore();
        return configUtilsLoad.restore();
      });

      it('should call fs.existsSync with dredd.yml', () => assert.isTrue(fsExistsSync.calledWith(configPath)));
      it('should never call configUtils.load', () => assert.isFalse(configUtilsLoad.called));
      it('should not print message about using configuration file', () => assert.notInclude(stdout, 'info: Configuration'));
    });
  });

  describe("to test various Errors - When API description document should be loaded from 'http(s)://...' url", () => {
    let server = null;

    const errorCmd = { argv: [
      `http://127.0.0.1:${PORT + 1}/connection-error.apib`,
      `http://127.0.0.1:${PORT + 1}`
    ]
    };
    const wrongCmd = { argv: [
      `http://127.0.0.1:${PORT}/not-found.apib`,
      `http://127.0.0.1:${PORT}`
    ]
    };
    const goodCmd = { argv: [
      `http://127.0.0.1:${PORT}/file.apib`,
      `http://127.0.0.1:${PORT}`
    ]
    };

    before((done) => {
      const app = express();

      app.get('/', (req, res) => res.sendStatus(404));

      app.get('/file.apib', (req, res) => {
        const stream = fs.createReadStream('./test/fixtures/single-get.apib');
        return stream.pipe(res.type('text'));
      });

      app.get('/machines', (req, res) => res.json([{ type: 'bulldozer', name: 'willy' }]));

      app.get('/not-found.apib', (req, res) => res.status(404).end());

      return server = app.listen(PORT, () => done());
    });

    after(done =>
      server.close(() => {
        const app = null;
        server = null;
        return done();
      })
    );

    describe('and I try to load a file from bad hostname at all', () => {
      before(done =>
        execCommand(errorCmd, () => done())
      );

      it('should exit with status 1', () => assert.equal(exitStatus, 1));

      it('should print error message to stderr', () => {
        assert.include(stderr, 'Error when loading file from URL');
        assert.include(stderr, 'Is the provided URL correct?');
        assert.include(stderr, 'connection-error.apib');
      });
    });

    describe('and I try to load a file that does not exist from an existing server', () => {
      before(done =>
        execCommand(wrongCmd, () => done())
      );

      it('should exit with status 1', () => assert.equal(exitStatus, 1));

      it('should print error message to stderr', () => {
        assert.include(stderr, 'Unable to load file from URL');
        assert.include(stderr, 'responded with status code 404');
        assert.include(stderr, 'not-found.apib');
      });
    });

    describe('and I try to load a file that actually is there', () => {
      before(done =>
        execCommand(goodCmd, () => done())
      );

      it('should exit with status 0', () => assert.equal(exitStatus, 0));
    });
  });
});
