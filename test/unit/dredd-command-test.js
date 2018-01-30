const {assert} = require('chai');
const sinon = require('sinon');
const express = require('express');
const proxyquire = require('proxyquire').noCallThru();

const options = require('../../src/options');
const packageData = require('../../package.json');

const loggerStub = require('../../src/logger');
const interactiveConfigStub = require('../../src/interactive-config');
const configUtilsStub = require('../../src/config-utils');
const fsStub = require('fs');
const crossSpawnStub = require('cross-spawn');

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
  'console': loggerStub,
  './logger': loggerStub,
  './interactive-init': interactiveConfigStub,
  './config-utils': configUtilsStub,
  'fs': fsStub,
  'cross-spawn': crossSpawnStub
});


const execCommand = function(custom = {}, cb) {
  stdout = '';
  stderr = '';
  exitStatus = null;
  let finished = false;
  const dreddCommand = new DreddCommand({
    custom
  }, function(code) {
    if (!finished) {
      finished = true;
      exitStatus = (code != null ? code : 0);
      return cb(null, stdout, stderr, (code != null ? code : 0));
    }
  }).run();
};

describe("DreddCommand class", function() {
  const dreddCommand = null;
  const env = {};

  before(function() {
    for (var method of ['warn', 'error']) { (method => sinon.stub(loggerStub, method).callsFake(chunk => stderr += `\n${method}: ${chunk}`))(method); }
    for (method of ['log', 'info', 'silly', 'verbose', 'test', 'hook', 'complete', 'pass', 'skip', 'debug', 'fail', 'request', 'expected', 'actual']) { (method => sinon.stub(loggerStub, method).callsFake(chunk => stdout += `\n${method}: ${chunk}`))(method); }
  });

  after(function() {
    for (var method of ['warn', 'error']) {
      loggerStub[method].restore();
    }
    for (method of ['log', 'info', 'silly', 'verbose', 'test', 'hook', 'complete', 'pass', 'skip', 'debug', 'fail', 'request', 'expected', 'actual']) {
      loggerStub[method].restore();
    }
  });


  describe('when initialized without "new" keyword', function() {
    let dc = null;
    before(() => dc = new DreddCommand);

    it('sets finished to false', () => assert.isFalse(dc.finished));

    it('sets custom to an Object with "argv" and "cwd" keys', function() {
      assert.isObject(dc.custom);
      assert.lengthOf(Object.keys(dc.custom), 2);
      assert.property(dc.custom, 'cwd');
      return assert.property(dc.custom, 'argv');
    });

    it('sets custom argv to an Array with process.argv', function() {
      assert.isArray(dc.custom != null ? dc.custom.argv : undefined);
      return assert.equal(dc.custom != null ? dc.custom.argv.length : undefined, 0);
    });

    return it('returns an instanceof DreddCommand', () => assert.instanceOf(dc, DreddCommand));
  });


  describe('when initialized with options containing exit callback', function() {
    let dc = null;
    let hasCalledExit = null;

    before(function() {
      dc = new DreddCommand({exit(code) {
        return hasCalledExit = true;
      }
      });
      return dc.run();
    });

    it('has argv property set to object with properties from optimist', function() {
      assert.isObject(dc.argv);
      assert.property(dc.argv, '_');
      return assert.isArray(dc.argv['_']);
  });

    it('should set finished to true (keeps false)', () => assert.isTrue(dc.finished));

    it('ends with an error message about missing blueprint-file', () => assert.include(stderr, 'Must specify path to API description document.'));

    it('ends with an error message about missing api endpoint.', () => assert.include(stderr, 'Must specify URL of the tested API instance.'));

    return it('calls exit callback', () => assert.isNotNull(hasCalledExit));
  });


  describe('run', function() {
    let dc = null;
    let initDreddStub = null;
    let initConfigSpy = null;
    let lastArgvIsApiEndpointSpy = null;
    let takeRestOfParamsAsPathSpy = null;

    before(function() {
      dc = new DreddCommand({
        exit() {},
        custom: {
          argv: ['./file.apib', 'http://127.0.0.1:3000'],
          env: {'NO_KEY': 'NO_VAL'}
        }
      });

      initDreddStub = sinon.stub(dc, 'initDredd').callsFake(function(configuration) {
        const dredd = new dreddStub(configuration);
        sinon.stub(dredd, 'run');
        return dredd;
      });

      initConfigSpy = sinon.spy(dc, 'initConfig');
      lastArgvIsApiEndpointSpy = sinon.spy(dc, 'lastArgvIsApiEndpoint');
      return takeRestOfParamsAsPathSpy = sinon.spy(dc, 'takeRestOfParamsAsPath');
    });

    after(function() {
      dc.initDredd.restore();
      dc.initConfig.restore();
      dc.lastArgvIsApiEndpoint.restore();
      return dc.takeRestOfParamsAsPath.restore();
    });

    return describe('with mocked initDredd', function() {
      before(() => dc.run());

      it('should call initConfig', () => assert.equal(initConfigSpy.called, 1));

      it('should call susequent helpers as part of initConfig', function() {
        assert.equal(lastArgvIsApiEndpointSpy.called, 1);
        return assert.equal(takeRestOfParamsAsPathSpy.called, 1);
      });

      return it('should call initDredd with configuration object', function() {
        assert.equal(dc.initDredd.called, 1);
        assert.isArray(dc.initDredd.firstCall.args);
        assert.lengthOf(dc.initDredd.firstCall.args, 1);
        assert.property(dc.initDredd.firstCall.args[0], 'server');
        assert.property(dc.initDredd.firstCall.args[0], 'options');
        assert.property(dc.initDredd.firstCall.args[0], 'custom');

        return assert.isObject(dc.dreddInstance);
      });
    });
  });

  describe('run with argv set to load regular blueprint', function() {
    let dc = null;
    const runDreddStub = null;
    let returnGood = true;

    beforeEach(function(done) {
      const app = express();

      app.get('/machines', function(req, res) {
        if (returnGood) {
          return res.json([{type: 'bulldozer', name: 'willy'}]);
        } else {
          return res.json([{my: 'another', world: 'service'}]);
        }
    });

      dc = new DreddCommand({
        custom: {
          argv: [
            './test/fixtures/single-get.apib',
            `http://127.0.0.1:${PORT}`,
            '--path=./test/fixtures/single-get.apib'
          ]
        },
        exit(code) {
          exitStatus = code;
          return server.close();
        }
      });

      var server = app.listen(PORT, () => dc.run());

      return server.on('close', done);
    });

    describe('with server returning good things', function() {
      before(() => returnGood = true);

      it('returns exit code 0', () => assert.equal(exitStatus, 0));

      return it('propagates configuration options to Dredd class', function() {
        assert.equal(dc.dreddInstance.configuration.options.path[0], "./test/fixtures/single-get.apib");
        return assert.equal(dc.dreddInstance.configuration.server, `http://127.0.0.1:${PORT}`);
      });
    });

    return describe('with server returning wrong things', function() {

      before(() => returnGood = false);

      it('returns exit code 1', () => assert.equal(exitStatus, 1));

      return it('propagates configuration options to Dredd class', function() {
        assert.equal(dc.dreddInstance.configuration.options.path[0], "./test/fixtures/single-get.apib");
        return assert.equal(dc.dreddInstance.configuration.server, `http://127.0.0.1:${PORT}`);
      });
    });
  });


  describe("when called w/ OR wo/ exiting arguments", function() {
    describe('--help', function() {
      before(done =>
        execCommand({argv: ['--help']}, () => done())
      );

      return it('prints out some really nice help text with all options descriptions', function() {
        assert.include(stderr, 'Usage:');
        assert.include(stderr, 'Example:');
        assert.include(stderr, '[OPTIONS]');
        return Array.from(Object.keys(options)).map((optionKey) => (optionKey => assert.include(stderr, optionKey))(optionKey));
      });
    });

    describe('--version', function() {
      before(done =>
        execCommand({argv: ['--version']}, () => done())
      );

      return it('prints out version', () => assert.include(stdout, `${packageData.name} v${packageData.version}`));
    });

    describe('"init" (nodejs)', function() {
      before(function(done) {
        sinon.stub(interactiveConfigStub, 'run').callsFake((argv, cb) => cb({language: 'nodejs'}));
        sinon.stub(configUtilsStub, 'save');
        return execCommand({argv: ['init']}, () => done());
      });

      after(function() {
        interactiveConfigStub.run.restore();
        return configUtilsStub.save.restore();
      });

      it('should run interactive config', () => assert.isTrue(interactiveConfigStub.run.called));

      return it('should save configuration', () => assert.isTrue(configUtilsStub.save.called));
    });

    describe('"init" (python)', function() {
      before(function(done) {
        sinon.stub(interactiveConfigStub, 'run').callsFake((argv, cb) => cb({language: 'python'}));
        sinon.stub(configUtilsStub, 'save');
        return execCommand({argv: ['init']}, () => done());
      });

      after(function() {
        interactiveConfigStub.run.restore();
        return configUtilsStub.save.restore();
      });

      it('should run interactive config', () => assert.isTrue(interactiveConfigStub.run.called));

      return it('should save configuration', () => assert.isTrue(configUtilsStub.save.called));
    });


    describe('"init" (php)', function() {
      before(function(done) {
        sinon.stub(interactiveConfigStub, 'run').callsFake((argv, cb) => cb({language: 'php'}));
        sinon.stub(configUtilsStub, 'save');
        return execCommand({argv: ['init']}, () => done());
      });

      after(function() {
        interactiveConfigStub.run.restore();
        return configUtilsStub.save.restore();
      });

      it('should run interactive config', () => assert.isTrue(interactiveConfigStub.run.called));

      return it('should save configuration', () => assert.isTrue(configUtilsStub.save.called));
    });

    describe('"init" (ruby)', function() {
      before(function(done) {
        sinon.stub(interactiveConfigStub, 'run').callsFake((argv, cb) => cb({language: 'ruby'}));
        sinon.stub(configUtilsStub, 'save');
        return execCommand({argv: ['init']}, () => done());
      });

      after(function() {
        interactiveConfigStub.run.restore();
        return configUtilsStub.save.restore();
      });

      it('should run interactive config', () => assert.isTrue(interactiveConfigStub.run.called));

      return it('should save configuration', () => assert.isTrue(configUtilsStub.save.called));
    });

    describe('"init" (perl)', function() {
      before(function(done) {
        sinon.stub(interactiveConfigStub, 'run').callsFake((argv, cb) => cb({language: 'perl'}));
        sinon.stub(configUtilsStub, 'save');
        return execCommand({argv: ['init']}, () => done());
      });

      after(function() {
        interactiveConfigStub.run.restore();
        return configUtilsStub.save.restore();
      });

      it('should run interactive config', () => assert.isTrue(interactiveConfigStub.run.called));

      return it('should save configuration', () => assert.isTrue(configUtilsStub.save.called));
    });

    describe('"init" (go)', function() {
      before(function(done) {
        sinon.stub(interactiveConfigStub, 'run').callsFake((argv, cb) => cb({language: 'go'}));
        sinon.stub(configUtilsStub, 'save');
        return execCommand({argv: ['init']}, () => done());
      });

      after(function() {
        interactiveConfigStub.run.restore();
        return configUtilsStub.save.restore();
      });

      it('should run interactive config', () => assert.isTrue(interactiveConfigStub.run.called));

      return it('should save configuration', () => assert.isTrue(configUtilsStub.save.called));
    });

    describe('"init" (rust)', function() {
      before(function(done) {
        sinon.stub(interactiveConfigStub, 'run').callsFake((argv, cb) => cb({language: 'rust'}));
        sinon.stub(configUtilsStub, 'save');
        return execCommand({argv: ['init']}, () => done());
      });

      after(function() {
        interactiveConfigStub.run.restore();
        return configUtilsStub.save.restore();
      });

      it('should run interactive config', () => assert.isTrue(interactiveConfigStub.run.called));

      return it('should save configuration', () => assert.isTrue(configUtilsStub.save.called));
    });

    return describe('without argv', function() {
      before(done =>
        execCommand({argv: []}, () => done())
      );

      return it('prints out an error message', () => assert.include(stderr, 'Error: Must specify'));
    });
  });


  describe('when configuration was saved', function() {
    before(function(done) {
      sinon.spy(dreddStub.prototype, 'init');
      sinon.stub(dreddStub.prototype, 'run').callsFake(function(cb) {
        const stats = {
          tests: 0,
          failures: 0,
          errors: 0,
          passes: 0,
          skipped: 0,
          start: 0,
          end: 0,
          duration: 0
        };
        return cb(null, stats);
      });

      sinon.stub(interactiveConfigStub, 'run').callsFake((config, cb) => cb());

      sinon.stub(fsStub, 'existsSync').callsFake(() => true);

      sinon.stub(configUtilsStub, 'load').callsFake(() =>
        ({
          "_": [ 'blueprint', 'endpoint' ],
          'dry-run': true,
          hookfiles: null,
          sandbox: false,
          save: null,
          load: null,
          server: null,
          init: false,
          custom: [],
          names: false,
          only: [],
          reporter: [],
          output: [],
          header: [],
          sorted: false,
          user: null,
          'inline-errors': false,
          details: false,
          method: [],
          color: true,
          level: 'info',
          timestamp: false,
          silent: false,
          path: [],
          '$0': 'node ./bin/dredd'
        }));

      return execCommand({argv: ['--names']}, () => done());
    });

    after(function() {
      dreddStub.prototype.run.restore();
      dreddStub.prototype.init.restore();
      interactiveConfigStub.run.restore();
      configUtilsStub.load.restore();
      return fsStub.existsSync.restore();
    });

    return describe('and I pass another CLI argument', function() {
      it('should want to exit with status 0', () => assert.equal(exitStatus, 0));

      it('should call dredd run', () => assert.isTrue(dreddStub.prototype.run.called));

      return it('should override existing configuration', function() {
        assert.isTrue(dreddStub.prototype.init.called);
        const call = dreddStub.prototype.init.getCall(0);
        const passedConf = call.args[0];
        return assert.propertyVal(passedConf.options, 'names', true);
      });
    });
  });

  return describe('when using --server', function() {

    beforeEach(function(done) {
      sinon.spy(crossSpawnStub, 'spawn');
      sinon.stub(transactionRunner.prototype, 'executeAllTransactions').callsFake((transactions, hooks, cb) => cb());
      return execCommand({argv: [
        './test/fixtures/single-get.apib',
        `http://127.0.0.1:${PORT}`,
        '--server',
        'foo/bar'
      ]
    }, () => done());
    });

    afterEach(() => crossSpawnStub.spawn.restore());

    return it('should run child process', () => assert.isTrue(crossSpawnStub.spawn.called));
  });
});
