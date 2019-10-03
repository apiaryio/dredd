import crossSpawnStub from 'cross-spawn';
import express from 'express';
import fsStub from 'fs';
import { noCallThru } from 'proxyquire';

import sinon from 'sinon';
import { assert } from 'chai';

import * as configUtilsStub from '../../lib/configUtils';
import loggerStub from '../../lib/logger';
import options from '../../options';
import * as packageData from '../../package.json';

const proxyquire = noCallThru();

const PORT = 9876;

let exitStatus;

let stderr = '';
let stdout = '';

const addHooksStub = proxyquire('../../lib/addHooks', {
  './logger': loggerStub,
}).default;

const transactionRunner = proxyquire('../../lib/TransactionRunner', {
  './addHooks': addHooksStub,
  './logger': loggerStub,
}).default;

const DreddStub = proxyquire('../../lib/Dredd', {
  './TransactionRunner': transactionRunner,
  './logger': loggerStub,
}).default;

const initStub = sinon.stub().callsFake((config, save, callback) => {
  save(config);
  callback();
});

const CLIStub = proxyquire('../../lib/CLI', {
  './Dredd': DreddStub,
  console: loggerStub,
  './logger': loggerStub,
  './init': initStub,
  './configUtils': configUtilsStub,
  fs: fsStub,
  'cross-spawn': crossSpawnStub,
}).default;

function execCommand(custom = {}, cb) {
  stdout = '';
  stderr = '';
  let finished = false;
  new CLIStub(
    {
      custom,
    },
    (code) => {
      if (!finished) {
        finished = true;
        exitStatus = code || 0;
        return cb();
      }
    },
  ).run();
}

describe('CLI class', () => {
  before(() => {
    const logLevels = ['warn', 'error', 'debug'];
    logLevels.forEach((method) => {
      sinon.stub(loggerStub, method).callsFake((chunk) => {
        stderr += `\n${method}: ${chunk}`;
      });
    });
    sinon.stub(loggerStub, 'log').callsFake((chunk) => {
      stdout += chunk;
    });
  });

  after(() => {
    const logLevels = ['warn', 'error', 'debug', 'log'];
    logLevels.forEach((method) => {
      loggerStub[method].restore();
    });
  });

  describe('when initialized without "new" keyword', () => {
    let dc = null;
    before(() => {
      dc = new CLIStub();
    });

    it('sets finished to false', () => assert.isFalse(dc.finished));

    it('sets custom to an Object with "argv" and "cwd" keys', () => {
      assert.isObject(dc.custom);
      assert.lengthOf(Object.keys(dc.custom), 2);
      assert.property(dc.custom, 'cwd');
      assert.property(dc.custom, 'argv');
    });

    it('sets custom argv to an Array with process.argv', () => {
      assert.isArray(dc.custom != null ? dc.custom.argv : undefined);
      assert.equal(dc.custom != null ? dc.custom.argv.length : undefined, 0);
    });

    it('returns an instanceof CLI', () => assert.instanceOf(dc, CLIStub));
  });

  describe('when initialized with options containing exit callback', () => {
    let dc = null;
    let hasCalledExit;

    before(() => {
      dc = new CLIStub({
        exit() {
          hasCalledExit = true;
        },
      });
      dc.run();
    });

    it('has argv property set to object with properties from optimist', () => {
      assert.isObject(dc.argv);
      assert.property(dc.argv, '_');
      assert.isArray(dc.argv._);
    });

    it('should set finished to true (keeps false)', () =>
      assert.isTrue(dc.finished));

    it('ends with an error message about missing blueprint-file', () =>
      assert.include(stderr, 'Must specify path to API description document.'));

    it('ends with an error message about missing api endpoint.', () =>
      assert.include(stderr, 'Must specify URL of the tested API instance.'));

    it('calls exit callback', () => assert.isNotNull(hasCalledExit));
  });

  describe('run', () => {
    let dc;
    let initConfigSpy;
    let lastArgvIsApiEndpointSpy;
    let takeRestOfParamsAsPathSpy;

    before(() => {
      dc = new CLIStub({
        exit() {},
        custom: {
          argv: ['./file.apib', 'http://127.0.0.1:3000'],
          env: { NO_KEY: 'NO_VAL' },
        },
      });

      sinon.stub(dc, 'initDredd').callsFake((configuration) => {
        const dredd = new DreddStub(configuration);
        sinon.stub(dredd, 'run');
        return dredd;
      });

      initConfigSpy = sinon.spy(dc, 'initConfig');
      lastArgvIsApiEndpointSpy = sinon.spy(dc, 'lastArgvIsApiEndpoint');
      takeRestOfParamsAsPathSpy = sinon.spy(dc, 'takeRestOfParamsAsPath');
    });

    after(() => {
      dc.initDredd.restore();
      dc.initConfig.restore();
      dc.lastArgvIsApiEndpoint.restore();
      dc.takeRestOfParamsAsPath.restore();
    });

    describe('with mocked initDredd', () => {
      before(() => dc.run());

      it('should call initConfig', () => assert.equal(initConfigSpy.called, 1));

      it('should call susequent helpers as part of initConfig', () => {
        assert.equal(lastArgvIsApiEndpointSpy.called, 1);
        assert.equal(takeRestOfParamsAsPathSpy.called, 1);
      });

      it('should call initDredd with configuration object', () => {
        assert.equal(dc.initDredd.called, 1);
        assert.isArray(dc.initDredd.firstCall.args);
        assert.lengthOf(dc.initDredd.firstCall.args, 1);
        assert.property(dc.initDredd.firstCall.args[0], 'server');
        assert.property(dc.initDredd.firstCall.args[0], 'path');
        assert.property(dc.initDredd.firstCall.args[0], 'loglevel');
        assert.property(dc.initDredd.firstCall.args[0], 'server');
        assert.property(dc.initDredd.firstCall.args[0], 'custom');

        assert.isObject(dc.dreddInstance);
      });
    });
  });

  describe('run with argv set to load regular blueprint', () => {
    let dc;
    let returnGood = true;

    beforeEach((done) => {
      const app = express();

      app.get('/machines', (req, res) => {
        if (returnGood) {
          return res.json([{ type: 'bulldozer', name: 'willy' }]);
        }
        res.json([{ my: 'another', world: 'service' }]);
      });

      dc = new CLIStub({
        custom: {
          argv: [
            './test/fixtures/single-get.apib',
            `http://127.0.0.1:${PORT}`,
            '--path=./test/fixtures/single-get.apib',
          ],
        },
        exit(code) {
          exitStatus = code;
          server.close();
        },
      });

      const server = app.listen(PORT, () => dc.run());

      server.on('close', done);
    });

    describe('with server returning good things', () => {
      before(() => {
        returnGood = true;
      });

      it('returns exit code 0', () => assert.equal(exitStatus, 0));

      it('propagates configuration options to Dredd class', () => {
        assert.equal(
          dc.dreddInstance.configuration.path[0],
          './test/fixtures/single-get.apib',
        );
        assert.equal(
          dc.dreddInstance.configuration.endpoint,
          `http://127.0.0.1:${PORT}`,
        );
      });
    });

    describe('with server returning wrong things', () => {
      before(() => {
        returnGood = false;
      });

      it('returns exit code 1', () => assert.equal(exitStatus, 1));

      it('propagates configuration options to Dredd class', () => {
        assert.equal(
          dc.dreddInstance.configuration.path[0],
          './test/fixtures/single-get.apib',
        );
        assert.equal(
          dc.dreddInstance.configuration.endpoint,
          `http://127.0.0.1:${PORT}`,
        );
      });
    });
  });

  describe('when called w/ OR wo/ exiting arguments', () => {
    describe('--help', () => {
      before((done) => execCommand({ argv: ['--help'] }, done));

      it('prints out some really nice help text with all options descriptions', () => {
        assert.include(stderr, 'Usage:');
        assert.include(stderr, 'Example:');
        assert.include(stderr, '[OPTIONS]');
        Array.from(Object.keys(options)).forEach((optionKey) =>
          assert.include(stderr, optionKey),
        );
      });
    });

    describe('--version', () => {
      before((done) => execCommand({ argv: ['--version'] }, done));

      it('prints out version', () => {
        assert.include(stdout, `${packageData.name} v${packageData.version}`);
      });
    });

    describe('init', () => {
      before((done) => {
        sinon.stub(configUtilsStub, 'save');
        execCommand({ argv: ['init'] }, done);
      });

      after(() => {
        configUtilsStub.save.restore();
      });

      it('should run interactive config', () => assert.isTrue(initStub.called));
      it('should save configuration', () =>
        assert.isTrue(configUtilsStub.save.called));
    });

    describe('without argv', () => {
      before((done) => execCommand({ argv: [] }, done));

      it('prints out an error message', () =>
        assert.include(stderr, 'Error: Must specify'));
    });
  });

  describe('when using --server', () => {
    before((done) => {
      sinon.stub(crossSpawnStub, 'spawn').callsFake();
      sinon
        .stub(transactionRunner.prototype, 'executeAllTransactions')
        .callsFake((transactions, hooks, cb) => cb());
      execCommand(
        {
          argv: [
            './test/fixtures/single-get.apib',
            `http://127.0.0.1:${PORT}`,
            '--server',
            'foo/bar',
          ],
        },
        done,
      );
    });

    after(() => crossSpawnStub.spawn.restore());

    it('should run child process', () =>
      assert.isTrue(crossSpawnStub.spawn.called));
  });
});
