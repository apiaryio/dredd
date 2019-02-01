const fsStub = require('fs');
const globStub = require('glob');
const sinon = require('sinon');
const pathStub = require('path');
const proxyquire = require('proxyquire');
const proxyquireStub = require('proxyquire');
const { assert } = require('chai');

const loggerStub = require('../../lib/logger');
const hooksStub = require('../../lib/Hooks');
const hooksWorkerClientStub = require('../../lib/HooksWorkerClient');

const proxyquireSpy = sinon.spy(proxyquireStub.noCallThru());
proxyquireStub.noCallThru = () => proxyquireSpy;


const addHooks = proxyquire('../../lib/addHooks', {
  logger: loggerStub,
  glob: globStub,
  pathStub,
  hooks: hooksStub,
  proxyquire: proxyquireStub,
  './HooksWorkerClient': hooksWorkerClientStub,
  fs: fsStub,
});

describe('addHooks(runner, transactions, callback)', () => {
  const transactions = {};

  before(() => { loggerStub.transports.console.silent = true; });

  after(() => { loggerStub.transports.console.silent = false; });

  describe('constructor', () => {
    const runner = {
      logs: ['item'],
      configuration: {
        options: {
          hookfiles: [],
        },
      },
    };

    it('should create hooks instance at runner.hooks', done => addHooks(runner, transactions, (err) => {
      if (err) { return err; }
      assert.isDefined(runner.hooks);
      assert.instanceOf(runner.hooks, hooksStub);
      assert.strictEqual(runner.hooks, runner.hooks);
      assert.nestedProperty(runner, 'hooks.transactions');
      done();
    }));


    it('should pass runner.logs to runner.hooks.logs', done => addHooks(runner, transactions, (err) => {
      if (err) { return err; }
      assert.isDefined(runner.hooks);
      assert.instanceOf(runner.hooks, hooksStub);
      assert.nestedProperty(runner, 'hooks.logs');
      assert.isDefined(runner.hooks.logs);
      assert.strictEqual(runner.hooks.logs, runner.logs);
      done();
    }));
  });


  describe('with no pattern', () => {
    let runner = null;

    before(() => {
      runner = {
        configuration: {
          options: {
            hookfiles: null,
          },
        },
      };

      sinon.spy(globStub, 'sync');
    });

    after(() => globStub.sync.restore());

    it('should not expand any glob', done => addHooks(runner, transactions, () => {
      assert.isOk(globStub.sync.notCalled);
      done();
    }));
  });

  describe('with non `nodejs` language option', () => {
    let runner = null;

    before(() => {
      runner = {
        configuration: {
          options: {
            language: 'ruby',
            hookfiles: './test/fixtures/non-js-hooks.rb',
          },
        },
      };

      sinon.stub(hooksWorkerClientStub.prototype, 'start').callsFake(cb => cb());
    });

    after(() => hooksWorkerClientStub.prototype.start.restore());

    it('should start the hooks worker client', done => addHooks(runner, transactions, (err) => {
      if (err) { return done(err); }
      assert.isTrue(hooksWorkerClientStub.prototype.start.called);
      done();
    }));
  });


  describe('with valid pattern', () => {
    let runner = null;
    before(() => {
      runner = {
        configuration: {
          options: {
            hookfiles: './test/**/*_hooks.*',
          },
        },
      };
    });

    it('should return files', (done) => {
      sinon.spy(globStub, 'sync');
      addHooks(runner, transactions, (err) => {
        if (err) { return done(err); }
        assert.isOk(globStub.sync.called);
        globStub.sync.restore();
        done();
      });
    });

    it('should return files with resolved paths', done => addHooks(runner, transactions, (err) => {
      if (err) { return done(err); }

      assert.deepEqual(runner.hooks.configuration.options.hookfiles, [
        pathStub.resolve(process.cwd(), './test/fixtures/multifile/multifile_hooks.coffee'),
        pathStub.resolve(process.cwd(), './test/fixtures/test2_hooks.js'),
        pathStub.resolve(process.cwd(), './test/fixtures/test_hooks.coffee'),
      ]);
      done();
    }));

    describe('when files are valid js/coffeescript', () => {
      runner = null;
      before(() => {
        runner = {
          configuration: {
            options: {
              hookfiles: './test/**/*_hooks.*',
            },
          },
        };
        sinon.stub(globStub, 'sync').callsFake(() => ['file1.js', 'file2.coffee']);
        sinon.stub(pathStub, 'resolve').callsFake(() => '/Users/netmilk/projects/dredd/file2.coffee');
      });

      after(() => {
        globStub.sync.restore();
        pathStub.resolve.restore();
      });

      it('should load the files', done => addHooks(runner, transactions, (err) => {
        if (err) { return done(err); }
        assert.isOk(pathStub.resolve.called);
        done();
      }));

      it('should add configuration object to the hooks object proxyquired to the each hookfile', done => addHooks(runner, transactions, (err) => {
        if (err) { return done(err); }
        const call = proxyquireSpy.getCall(0);
        const hooksObject = call.args[1].hooks;
        assert.property(hooksObject, 'configuration');
        done();
      }));
    });
  });
});
