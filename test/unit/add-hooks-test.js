/* eslint-disable
    no-return-assign,
    no-unused-vars,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
const { assert } = require('chai');
const proxyquire = require('proxyquire');
const sinon = require('sinon');
const clone = require('clone');

const globStub = require('glob');
const pathStub = require('path');
const loggerStub = require('../../src/logger');
const hooksStub = require('../../src/hooks');
const hooksWorkerClientStub = require('../../src/hooks-worker-client');

const proxyquireStub = require('proxyquire');

const proxyquireSpy = sinon.spy(proxyquireStub.noCallThru());
proxyquireStub.noCallThru = () => proxyquireSpy;

const sandboxHooksCodeSpy = sinon.spy(require('../../src/sandbox-hooks-code'));
const fsStub = require('fs');

const addHooks = proxyquire('../../src/add-hooks', {
  logger: loggerStub,
  glob: globStub,
  pathStub,
  hooks: hooksStub,
  proxyquire: proxyquireStub,
  './sandbox-hooks-code': sandboxHooksCodeSpy,
  './hooks-worker-client': hooksWorkerClientStub,
  fs: fsStub
});

describe('addHooks(runner, transactions, callback)', () => {
  const transactions = {};
  const server = null;

  before(() => loggerStub.transports.console.silent = true);

  after(() => loggerStub.transports.console.silent = false);

  describe('constructor', () => {
    const runner = {
      logs: ['item'],
      configuration: {
        options: {
          hookfiles: null
        }
      }
    };

    it('should create hooks instance at runner.hooks', done =>
      addHooks(runner, transactions, (err) => {
        if (err) { return err; }
        assert.isDefined(runner.hooks);
        assert.instanceOf(runner.hooks, hooksStub);
        assert.strictEqual(runner.hooks, runner.hooks);
        assert.nestedProperty(runner, 'hooks.transactions');
        return done();
      })
    );


    return it('should pass runner.logs to runner.hooks.logs', done =>
      addHooks(runner, transactions, (err) => {
        if (err) { return err; }
        assert.isDefined(runner.hooks);
        assert.instanceOf(runner.hooks, hooksStub);
        assert.nestedProperty(runner, 'hooks.logs');
        assert.isDefined(runner.hooks.logs);
        assert.strictEqual(runner.hooks.logs, runner.logs);
        return done();
      })
    );
  });


  describe('with no pattern', () => {
    let runner = null;

    before(() => {
      runner = {
        configuration: {
          options: {
            hookfiles: null
          }
        }
      };

      return sinon.spy(globStub, 'sync');
    });

    after(() => globStub.sync.restore());

    return it('should not expand any glob', done =>
      addHooks(runner, transactions, (err) => {
        assert.isOk(globStub.sync.notCalled);
        return done();
      })
    );
  });

  describe('with non `nodejs` language option', () => {
    let runner = null;

    beforeEach(() => {
      runner = {
        configuration: {
          options: {
            language: 'ruby',
            hookfiles: './test/fixtures/non-js-hooks.rb'
          }
        }
      };

      return sinon.stub(hooksWorkerClientStub.prototype, 'start').callsFake(cb => cb());
    });

    afterEach(() => hooksWorkerClientStub.prototype.start.restore());

    return it('should start the hooks worker client', done =>
      addHooks(runner, transactions, (err) => {
        if (err) { return done(err); }
        assert.isTrue(hooksWorkerClientStub.prototype.start.called);
        return done();
      })
    );
  });


  describe('with valid pattern', () => {
    let runner = null;
    beforeEach(() =>
      runner = {
        configuration: {
          options: {
            hookfiles: './test/**/*_hooks.*'
          }
        }
      }
    );

    it('should return files', (done) => {
      sinon.spy(globStub, 'sync');
      return addHooks(runner, transactions, (err) => {
        if (err) { return done(err); }
        assert.isOk(globStub.sync.called);
        globStub.sync.restore();
        return done();
      });
    });

    it('should return files with resolved paths', done =>
      addHooks(runner, transactions, (err) => {
        if (err) { return done(err); }

        assert.deepEqual(runner.hooks.configuration.options.hookfiles, [
          pathStub.resolve(process.cwd(), './test/fixtures/multifile/multifile_hooks.coffee'),
          pathStub.resolve(process.cwd(), './test/fixtures/test2_hooks.js'),
          pathStub.resolve(process.cwd(), './test/fixtures/test_hooks.coffee')
        ]);
        return done();
      })
    );

    return describe('when files are valid js/coffeescript', () => {
      runner = null;
      before(() => {
        runner = {
          configuration: {
            options: {
              hookfiles: './test/**/*_hooks.*'
            }
          }
        };
        sinon.stub(globStub, 'sync').callsFake(pattern => ['file1.js', 'file2.coffee']);
        return sinon.stub(pathStub, 'resolve').callsFake((path, rel) => '/Users/netmilk/projects/dredd/file2.coffee');
      });

      after(() => {
        globStub.sync.restore();
        return pathStub.resolve.restore();
      });

      it('should load the files', done =>
        addHooks(runner, transactions, (err) => {
          if (err) { return done(err); }
          assert.isOk(pathStub.resolve.called);
          return done();
        })
      );

      return it('should add configuration object to the hooks object proxyquired to the each hookfile', done =>
        addHooks(runner, transactions, (err) => {
          if (err) { return done(err); }
          const call = proxyquireSpy.getCall(0);
          const hooksObject = call.args[1].hooks;
          assert.property(hooksObject, 'configuration');
          return done();
        })
      );
    });
  });

  describe('when sandboxed mode is on', () => {
    describe('when hookfiles option is given', () => {
      let runner = {};
      beforeEach((done) => {
        runner = {
          configuration: {
            options: {
              hookfiles: './test/fixtures/sandboxed-hook.js',
              sandbox: true
            }
          }
        };

        sinon.spy(loggerStub, 'warn');
        sinon.spy(loggerStub, 'info');
        sinon.spy(fsStub, 'readFile');
        proxyquireSpy.reset();
        sandboxHooksCodeSpy.reset();
        return done();
      });

      afterEach((done) => {
        loggerStub.warn.restore();
        loggerStub.info.restore();
        fsStub.readFile.restore();
        proxyquireSpy.reset();
        sandboxHooksCodeSpy.reset();
        return done();
      });

      it('should not use proxyquire', done =>
        addHooks(runner, transactions, (err) => {
          if (err) { return done(err); }
          assert.isFalse(proxyquireSpy.called);
          return done();
        })
      );

      it('should load files from the filesystem', done =>
        addHooks(runner, transactions, (err) => {
          if (err) { return done(err); }
          assert.isTrue(fsStub.readFile.called);
          return done();
        })
      );

      it('should run the loaded code', done =>
        addHooks(runner, transactions, (err) => {
          if (err) { return err; }
          assert.isTrue(sandboxHooksCodeSpy.called);
          return done();
        })
      );

      return it('should add hook functions strings to the runner object', done =>
        addHooks(runner, transactions, (err) => {
          if (err) { return err; }
          assert.property(runner.hooks.afterHooks, 'Machines > Machines collection > Get Machines');
          return done();
        })
      );
    });

    describe('when hookfiles option is not given and hooks are passed as a string from Dredd class', () => {
      let runner = {};
      beforeEach(() => {
        runner = {
          configuration: {
            hooksData: {
              'some-filename.js': `\
after('Machines > Machines collection > Get Machines', function(transaction){
  transaction['fail'] = 'failed in sandboxed hook';
});\
`
            },
            options: {
              sandbox: true
            }
          }
        };

        sinon.spy(loggerStub, 'warn');
        sinon.spy(loggerStub, 'info');
        sinon.spy(fsStub, 'readFile');
        proxyquireSpy.reset();
        return sandboxHooksCodeSpy.reset();
      });

      afterEach(() => {
        loggerStub.warn.restore();
        loggerStub.info.restore();
        fsStub.readFile.restore();
        proxyquireSpy.reset();
        return sandboxHooksCodeSpy.reset();
      });

      it('should not use proxyquire', done =>
        addHooks(runner, transactions, (err) => {
          if (err) { return done(err); }
          assert.isFalse(proxyquireSpy.called);
          return done();
        })
      );

      it('should run the loaded code', done =>
        addHooks(runner, transactions, (err) => {
          if (err) { return err; }
          assert.isTrue(sandboxHooksCodeSpy.called);
          return done();
        })
      );

      return it('should add hook functions strings to the runner object', done =>
        addHooks(runner, transactions, (err) => {
          if (err) { return err; }
          assert.property(runner.hooks.afterHooks, 'Machines > Machines collection > Get Machines');
          return done();
        })
      );
    });

    describe('when hooks are passed as a string from Dredd class', () => {
      let runner = {};
      beforeEach(() =>
        runner = {
          configuration: {
            hooksData: {
              'some-filename.js': `\
after('Machines > Machines collection > Get Machines', function(transaction){
  transaction['fail'] = 'failed in sandboxed hook';
});\
`
            },
            options: {}
          }
        });

      return it('should throw a "not implemented" exception', done =>
        addHooks(runner, transactions, (err) => {
          assert.isDefined(err);
          assert.include(err.message, 'not implemented');
          return done();
        })
      );
    });


    return describe('when buggy transaction name is used (#168)', () =>
      describe('when sandboxed', () => {
        it('should remove leading " > " from transaction names', (done) => {
          const runner = {
            configuration: {
              hooksData: {
                'hookfile.js': `\
after(' > Machines collection > Get Machines', function(transaction){
  transaction['fail'] = 'failed in sandboxed hook';
});
before(' > Machines collection > Get Machines', function(transaction){
  transaction['fail'] = 'failed in sandboxed hook';
});\
`
              },
              options: {
                sandbox: true
              }
            }
          };

          return addHooks(runner, transactions, (err) => {
            assert.notProperty(runner.hooks.afterHooks, ' > Machines collection > Get Machines');
            assert.notProperty(runner.hooks.afterHooks, ' > Machines collection > Get Machines');
            return done();
          });
        });

        return it('should contain transaction with fixed name', (done) => {
          const runner = {
            configuration: {
              hooksData: {
                'hookfile.js': `\
after(' > Machines collection > Get Machines', function(transaction){
  transaction['fail'] = 'failed in sandboxed hook';
});
before(' > Machines collection > Get Machines', function(transaction){
  transaction['fail'] = 'failed in sandboxed hook';
});\
`
              },
              options: {
                sandbox: true
              }
            }
          };

          return addHooks(runner, transactions, (err) => {
            assert.property(runner.hooks.afterHooks, 'Machines collection > Get Machines');
            assert.property(runner.hooks.afterHooks, 'Machines collection > Get Machines');
            return done();
          });
        });
      })
    );
  });

  return describe('when not sandboxed', () => {
    it('should remove leading " > " from transaction names', (done) => {
      const runner = {
        configuration: {
          options: {
            hookfiles: './test/fixtures/groupless-names.js'
          }
        }
      };

      return addHooks(runner, transactions, (err) => {
        assert.notProperty(runner.hooks.afterHooks, ' > Machines collection > Get Machines');
        assert.notProperty(runner.hooks.afterHooks, ' > Machines collection > Get Machines');
        return done();
      });
    });

    return it('should contain transaction with fixed name', (done) => {
      const runner = {
        configuration: {
          options: {
            hookfiles: './test/fixtures/groupless-names.js'
          }
        }
      };

      return addHooks(runner, transactions, (err) => {
        assert.property(runner.hooks.afterHooks, 'Machines collection > Get Machines');
        assert.property(runner.hooks.afterHooks, 'Machines collection > Get Machines');
        return done();
      });
    });
  });
});
