const bodyParser = require('body-parser');
const express = require('express');
const fsStub = require('fs');
const proxyquire = require('proxyquire').noCallThru();
const requestStub = require('request');
const sinon = require('sinon');
const { assert } = require('chai');

const dreddTransactionsStub = require('dredd-transactions');
const loggerStub = require('../../lib/logger');

const Dredd = proxyquire('../../lib/Dredd', {
  request: requestStub,
  'dredd-transactions': dreddTransactionsStub,
  fs: fsStub,
  './logger': loggerStub,
});

describe('Dredd class', () => {
  let configuration = {};
  let dredd = {};

  beforeEach(() => sinon.spy(fsStub, 'readFile'));

  afterEach(() => fsStub.readFile.restore());

  describe('with valid configuration', () => {
    before(() => {
      configuration = {
        server: 'http://127.0.0.1:3000/',
        options: {
          silent: true,
          method: 'get',
          header: 'Accept:application/json',
          user: 'bob:test',
          sorted: true,
          path: ['./test/fixtures/apiary.apib'],
        },
      };
    });

    it('should copy configuration on creation', () => {
      dredd = new Dredd(configuration);
      assert.isOk(dredd.configuration.options.silent);
      assert.notOk(dredd.configuration.options['dry-run']);
    });

    it('should load the file on given path', (done) => {
      dredd = new Dredd(configuration);
      sinon.stub(dredd.runner, 'executeTransaction').callsFake((transaction, hooks, callback) => callback());
      dredd.run(() => {
        assert.isOk(fsStub.readFile.calledWith(configuration.options.path[0]));
        dredd.runner.executeTransaction.restore();
        done();
      });
    });

    it('should not pass any error to the callback function', (done) => {
      dredd = new Dredd(configuration);
      sinon.stub(dredd.runner, 'executeTransaction').callsFake((transaction, hooks, callback) => callback());
      dredd.run((error) => {
        assert.isNull(error);
        dredd.runner.executeTransaction.restore();
        done();
      });
    });

    it('should pass the reporter as second argument', (done) => {
      dredd = new Dredd(configuration);
      sinon.stub(dredd.runner, 'executeTransaction').callsFake((transaction, hooks, callback) => callback());
      dredd.run((error, reporter) => {
        assert.isDefined(reporter);
        dredd.runner.executeTransaction.restore();
        done();
      });
    });

    it('should convert ast to runtime', (done) => {
      sinon.spy(dreddTransactionsStub, 'compile');
      dredd = new Dredd(configuration);
      sinon.stub(dredd.runner, 'executeTransaction').callsFake((transaction, hooks, callback) => callback());
      dredd.run(() => {
        assert.isOk(dreddTransactionsStub.compile.called);
        dredd.runner.executeTransaction.restore();
        done();
      });
    });

    describe('when paths specified with glob paterns', () => {
      before(() => {
        configuration = {
          server: 'http://127.0.0.1:3000/',
          options: {
            silent: true,
            path: ['./test/fixtures/multifile/*.apib', './test/fixtures/multifile/*.apib'],
          },
        };
        dredd = new Dredd(configuration);
      });

      beforeEach(() => sinon.stub(dredd.runner, 'executeTransaction').callsFake((transaction, hooks, callback) => callback()));

      afterEach(() => dredd.runner.executeTransaction.restore());

      it('should expand all glob patterns and resolved paths should be unique', done => dredd.run((error) => {
        if (error) { return done(error); }
        assert.equal(dredd.configuration.files.length, 3);
        assert.include(dredd.configuration.files, './test/fixtures/multifile/message.apib');
        done();
      }));

      it('should remove globs from config', done => dredd.run((error) => {
        if (error) { return done(error); }
        assert.notInclude(dredd.configuration.files, './test/fixtures/multifile/*.apib');
        done();
      }));

      it('should load file contents on paths to config', done => dredd.run((error) => {
        if (error) { return done(error); }
        assert.isObject(dredd.configuration.data);
        assert.property(dredd.configuration.data, './test/fixtures/multifile/greeting.apib');
        assert.isObject(dredd.configuration.data['./test/fixtures/multifile/greeting.apib']);
        assert.property(dredd.configuration.data['./test/fixtures/multifile/greeting.apib'], 'filename');
        assert.property(dredd.configuration.data['./test/fixtures/multifile/greeting.apib'], 'raw');
        done();
      }));

      it('should parse loaded files', done => dredd.run((error) => {
        if (error) { return done(error); }
        assert.isObject(dredd.configuration.data['./test/fixtures/multifile/greeting.apib']);
        assert.property(dredd.configuration.data['./test/fixtures/multifile/greeting.apib'], 'annotations');
        assert.property(dredd.configuration.data['./test/fixtures/multifile/greeting.apib'], 'filename');
        assert.property(dredd.configuration.data['./test/fixtures/multifile/greeting.apib'], 'raw');
        done();
      }));
    });


    describe('when a glob pattern does not match any files and another does', () => {
      before(() => {
        configuration = {
          server: 'http://127.0.0.1:3000/',
          options: {
            silent: true,
            path: ['./test/fixtures/multifile/*.balony', './test/fixtures/multifile/*.apib'],
          },
        };
        dredd = new Dredd(configuration);
      });

      beforeEach(() => sinon.stub(dredd.runner, 'executeTransaction').callsFake((transaction, hooks, callback) => callback()));

      afterEach(() => dredd.runner.executeTransaction.restore());

      it('should return error', done => dredd.run((error) => {
        assert.isOk(error);
        done();
      }));
    });


    describe('when glob pattern does not match any files', () => {
      before(() => {
        configuration = {
          server: 'http://127.0.0.1:3000/',
          options: {
            silent: true,
            path: ['./test/fixtures/multifile/*.balony'],
          },
        };
        dredd = new Dredd(configuration);
      });

      beforeEach(() => sinon.stub(dredd.runner, 'executeTransaction').callsFake((transaction, hooks, callback) => callback()));

      afterEach(() => dredd.runner.executeTransaction.restore());

      it('should return error', done => dredd.run((error) => {
        assert.isOk(error);
        done();
      }));
    });


    describe('when configuration contains data object with "filename" as key, and an API description document contents as value', () => {
      beforeEach(() => {
        configuration = {
          server: 'http://127.0.0.1:3000/',
          options: {
            silent: true,
          },
          data: {
            testingDirectObject: {
              filename: 'testingDirectObjectFilename',
              raw: `\
# API name

GET /url
+ Response 200 (application/json)

        {"a":"b"}'\
`,
            },
            testingDirectBlueprintString: `\
# API name

GET /url
+ Response 200 (application/json)

        {"a":"b"}'\
`,
          },
        };
        dredd = new Dredd(configuration);
        sinon.stub(dredd.runner, 'executeTransaction').callsFake((transaction, hooks, callback) => callback());
      });

      afterEach(() => dredd.runner.executeTransaction.restore());

      it('should not expand any glob patterns', done => dredd.run((error) => {
        if (error) { return done(error); }
        assert.lengthOf(dredd.configuration.files, 0);
        done();
      }));

      it('should pass data contents to config', done => dredd.run((error) => {
        if (error) { return done(error); }
        assert.isObject(dredd.configuration.data);
        assert.notNestedProperty(dredd, 'configuration.data.testingDirectObject');
        assert.nestedPropertyVal(dredd, 'configuration.data.testingDirectObjectFilename.filename', 'testingDirectObjectFilename');
        assert.nestedProperty(dredd, 'configuration.data.testingDirectObjectFilename.raw');
        assert.nestedPropertyVal(dredd, 'configuration.data.testingDirectBlueprintString.filename', 'testingDirectBlueprintString');
        assert.nestedProperty(dredd, 'configuration.data.testingDirectBlueprintString.raw');
        done();
      }));

      it('should parse passed data contents', done => dredd.run((error) => {
        if (error) { return done(error); }
        assert.nestedProperty(dredd, 'configuration.data.testingDirectObjectFilename.annotations');
        assert.nestedProperty(dredd, 'configuration.data.testingDirectBlueprintString.annotations');
        done();
      }));

      describe('and I also set configuration.options.path to an existing file', () => {
        let localdredd;
        beforeEach(() => {
          if (!configuration.options) { configuration.options = {}; }
          configuration.options.path = ['./test/fixtures/apiary.apib'];
          localdredd = new Dredd(configuration);
          sinon.stub(localdredd.runner, 'executeTransaction').callsFake((transaction, hooks, callback) => callback());
        });

        afterEach(() => localdredd.runner.executeTransaction.restore());

        it('should fill configuration data with data and one file at that path', done => localdredd.run((error) => {
          if (error) { return done(error); }
          assert.lengthOf(localdredd.configuration.files, 1);
          assert.isObject(localdredd.configuration.data);
          assert.lengthOf(Object.keys(localdredd.configuration.data), 3);
          assert.property(localdredd.configuration.data, './test/fixtures/apiary.apib');
          assert.propertyVal(localdredd.configuration.data['./test/fixtures/apiary.apib'], 'filename', './test/fixtures/apiary.apib');
          assert.property(localdredd.configuration.data['./test/fixtures/apiary.apib'], 'raw');
          assert.property(localdredd.configuration.data['./test/fixtures/apiary.apib'], 'annotations');
          assert.nestedPropertyVal(localdredd, 'configuration.data.testingDirectObjectFilename.filename', 'testingDirectObjectFilename');
          assert.nestedProperty(localdredd, 'configuration.data.testingDirectObjectFilename.raw');
          assert.nestedProperty(localdredd, 'configuration.data.testingDirectObjectFilename.annotations');
          assert.nestedPropertyVal(localdredd, 'configuration.data.testingDirectBlueprintString.filename', 'testingDirectBlueprintString');
          assert.nestedProperty(localdredd, 'configuration.data.testingDirectBlueprintString.raw');
          assert.nestedProperty(localdredd, 'configuration.data.testingDirectBlueprintString.annotations');
          done();
        }));
      });
    });


    describe('when paths are specified as a mix of URLs and a glob path', () => {
      let blueprintCode;
      before((done) => {
        configuration = {
          server: 'http://127.0.0.1:3000/',
          options: {
            silent: true,
            path: ['http://some.path.to/file.apib', 'https://another.path.to/apiary.apib', './test/fixtures/multifile/*.apib'],
          },
        };
        dredd = new Dredd(configuration);
        fsStub.readFile('./test/fixtures/single-get.apib', 'utf8', (err, content) => {
          blueprintCode = content.toString();
          done(err);
        });
      });

      beforeEach(() => sinon.stub(dredd.runner, 'executeTransaction').callsFake((transaction, hooks, callback) => callback()));

      afterEach(() => dredd.runner.executeTransaction.restore());

      describe('when all URLs can be downloaded', () => {
        before(() =>
          // eslint-disable-next-line
          sinon.stub(requestStub, 'get').callsFake((receivedArgs = {}, cb) => cb(null, { statusCode: 200 }, blueprintCode)));

        after(() => requestStub.get.restore());

        it('should expand glob pattern and resolved paths should be unique', done => dredd.run((error) => {
          if (error) { return done(error); }
          assert.lengthOf(dredd.configuration.files, 5);
          assert.sameMembers(dredd.configuration.files, [
            'http://some.path.to/file.apib',
            'https://another.path.to/apiary.apib',
            './test/fixtures/multifile/message.apib',
            './test/fixtures/multifile/greeting.apib',
            './test/fixtures/multifile/name.apib',
          ]);
          done();
        }));

        it('should remove globs from config', done => dredd.run((error) => {
          if (error) { return done(error); }
          assert.notInclude(dredd.configuration.files, './test/fixtures/multifile/*.apib');
          done();
        }));

        it('should load file contents on paths to config and parse these files', done => dredd.run((error) => {
          if (error) { return done(error); }
          assert.isObject(dredd.configuration.data);
          assert.property(dredd.configuration.data, './test/fixtures/multifile/greeting.apib');
          assert.property(dredd.configuration.data, 'http://some.path.to/file.apib');
          assert.property(dredd.configuration.data, 'https://another.path.to/apiary.apib');

          assert.isObject(dredd.configuration.data['./test/fixtures/multifile/name.apib']);
          assert.property(dredd.configuration.data['./test/fixtures/multifile/name.apib'], 'filename');
          assert.property(dredd.configuration.data['./test/fixtures/multifile/name.apib'], 'raw');
          assert.property(dredd.configuration.data['./test/fixtures/multifile/name.apib'], 'annotations');

          assert.isObject(dredd.configuration.data['./test/fixtures/multifile/message.apib']);
          assert.property(dredd.configuration.data['./test/fixtures/multifile/message.apib'], 'filename');
          assert.property(dredd.configuration.data['./test/fixtures/multifile/message.apib'], 'raw');
          assert.property(dredd.configuration.data['./test/fixtures/multifile/message.apib'], 'annotations');

          assert.isObject(dredd.configuration.data['./test/fixtures/multifile/greeting.apib']);
          assert.property(dredd.configuration.data['./test/fixtures/multifile/greeting.apib'], 'filename');
          assert.property(dredd.configuration.data['./test/fixtures/multifile/greeting.apib'], 'raw');
          assert.property(dredd.configuration.data['./test/fixtures/multifile/greeting.apib'], 'annotations');

          assert.isObject(dredd.configuration.data['http://some.path.to/file.apib']);
          assert.property(dredd.configuration.data['http://some.path.to/file.apib'], 'filename');
          assert.property(dredd.configuration.data['http://some.path.to/file.apib'], 'raw');
          assert.property(dredd.configuration.data['http://some.path.to/file.apib'], 'annotations');

          assert.isObject(dredd.configuration.data['https://another.path.to/apiary.apib']);
          assert.property(dredd.configuration.data['https://another.path.to/apiary.apib'], 'filename');
          assert.property(dredd.configuration.data['https://another.path.to/apiary.apib'], 'raw');
          assert.property(dredd.configuration.data['https://another.path.to/apiary.apib'], 'annotations');
          done();
        }));
      });

      describe('when an URL for one API description document returns 404 not-found', () => {
        before(() => sinon.stub(requestStub, 'get').callsFake((receivedArgs = {}, cb) => {
          if ((receivedArgs ? receivedArgs.url : undefined) === 'https://another.path.to/apiary.apib') {
            return cb(null, { statusCode: 404 }, 'Page Not Found');
          }
          cb(null, { statusCode: 200 }, blueprintCode);
        }));

        after(() => requestStub.get.restore());

        it('should exit with an error', done => dredd.run((error) => {
          assert.isOk(error);
          assert.instanceOf(error, Error);
          assert.property(error, 'message');
          assert.include(error.message, 'Unable to load file from URL');
          done();
        }));

        it('should not execute any transaction', done => dredd.run(() => {
          assert.notOk(dredd.runner.executeTransaction.called);
          done();
        }));
      });

      describe('when an URL for one API description document is unreachable (erroneous)', () => {
        before(() => sinon.stub(requestStub, 'get').callsFake((receivedArgs = {}, cb) => {
          if ((receivedArgs ? receivedArgs.url : undefined) === 'http://some.path.to/file.apib') {
            // Server not found on
            return cb({ code: 'ENOTFOUND' });
          }
          cb(null, { statusCode: 200 }, blueprintCode);
        }));

        after(() => requestStub.get.restore());

        it('should exit with an error', done => dredd.run((error) => {
          assert.isOk(error);
          assert.instanceOf(error, Error);
          assert.property(error, 'message');
          assert.include(error.message, 'Error when loading file from URL');
          done();
        }));

        it('should not execute any transaction', done => dredd.run(() => {
          assert.notOk(dredd.runner.executeTransaction.called);
          done();
        }));
      });
    });
  });

  describe('when API description document parsing error', () => {
    before(() => {
      configuration = {
        url: 'http://127.0.0.1:3000/',
        options: {
          silent: true,
          path: ['./test/fixtures/error-blueprint.apib'],
        },
      };
      dredd = new Dredd(configuration);
    });

    beforeEach(() => sinon.stub(dredd.runner, 'executeTransaction').callsFake((transaction, hooks, callback) => callback()));

    afterEach(() => dredd.runner.executeTransaction.restore());

    it('should exit with an error', done => dredd.run((error) => {
      assert.isOk(error);
      done();
    }));

    it('should NOT execute any transaction', done => dredd.run(() => {
      assert.notOk(dredd.runner.executeTransaction.called);
      done();
    }));
  });

  describe('when API description document parsing warning', () => {
    before(() => {
      configuration = {
        url: 'http://127.0.0.1:3000/',
        options: {
          silent: true,
          path: ['./test/fixtures/warning-ambiguous.apib'],
        },
      };
      dredd = new Dredd(configuration);
    });

    beforeEach(() => {
      sinon.stub(dredd.runner, 'run').callsFake((transaction, callback) => callback());
      sinon.spy(loggerStub, 'warn');
    });

    afterEach(() => {
      dredd.runner.run.restore();
      loggerStub.warn.restore();
    });

    it('should execute the runtime', done => dredd.run(() => {
      assert.isOk(dredd.runner.run.called);
      done();
    }));

    it('should write warnings to warn logger', done => dredd.run(() => {
      assert.isOk(loggerStub.warn.called);
      done();
    }));
  });

  describe('when non existing API description document path', () => {
    beforeEach(() => {
      configuration = {
        url: 'http://127.0.0.1:3000/',
        options: {
          silent: true,
          path: ['./balony/path.apib'],
        },
      };
      dredd = new Dredd(configuration);
      sinon.stub(dredd.runner, 'executeTransaction').callsFake((transaction, hooks, callback) => callback());
    });

    afterEach(() => dredd.runner.executeTransaction.resetHistory());

    it('should pass the error to the callback function', done => dredd.run((error) => {
      assert.isOk(error);
      done();
    }));

    it('should NOT execute any transaction', done => dredd.run(() => {
      assert.notOk(dredd.runner.executeTransaction.called);
      done();
    }));
  });

  describe('when runtime contains any error', () => {
    beforeEach(() => {
      configuration = {
        server: 'http://127.0.0.1:3000/',
        options: {
          silent: true,
          path: ['./test/fixtures/error-uri-template.apib'],
        },
      };

      dredd = new Dredd(configuration);
      sinon.stub(dredd.runner, 'executeTransaction').callsFake((transaction, hooks, callback) => callback());
    });

    afterEach(() => dredd.runner.executeTransaction.resetHistory());

    it('should NOT execute any transaction', done => dredd.run(() => {
      assert.notOk(dredd.runner.executeTransaction.called);
      done();
    }));

    it('should exit with an error', done => dredd.run((error) => {
      assert.isOk(error);
      done();
    }));
  });

  describe('when runtime contains any warning', () => {
    beforeEach(() => {
      configuration = {
        server: 'http://127.0.0.1:3000/',
        options: {
          silent: true,
          path: ['./test/fixtures/warning-ambiguous.apib'],
        },
      };
      sinon.spy(loggerStub, 'warn');
      dredd = new Dredd(configuration);
      sinon.stub(dredd.runner, 'executeTransaction').callsFake((transaction, hooks, callback) => callback());
    });

    afterEach(() => {
      dredd.runner.executeTransaction.resetHistory();
      loggerStub.warn.restore();
    });

    it('should execute some transaction', done => dredd.run(() => {
      assert.isOk(dredd.runner.executeTransaction.called);
      done();
    }));

    it('should print runtime warnings to stdout', done => dredd.run(() => {
      assert.isOk(loggerStub.warn.called);
      done();
    }));

    it('should not exit', done => dredd.run((error) => {
      assert.notOk(error);
      done();
    }));
  });

  describe('when runtime is without errors and warnings', () => {
    beforeEach(() => {
      configuration = {
        server: 'http://127.0.0.1:3000/',
        options: {
          silent: true,
          path: ['./test/fixtures/apiary.apib'],
        },
      };
      dredd = new Dredd(configuration);
      sinon.stub(dredd.runner, 'executeTransaction').callsFake((transaction, hooks, callback) => callback());
    });

    afterEach(() => dredd.runner.executeTransaction.resetHistory());

    it('should execute the runtime', done => dredd.run(() => {
      assert.isOk(dredd.runner.executeTransaction.called);
      done();
    }));
  });

  describe('#emitStart', () => {
    describe('no error in reporter occurs', () => {
      const PORT = 9876;
      dredd = null;
      let apiaryServer;

      beforeEach((done) => {
        configuration = {
          server: 'http://127.0.0.1:3000/',
          options: {
            silent: true,
            reporter: ['apiary'],
            path: ['./test/fixtures/apiary.apib'],
            custom: {
              apiaryApiUrl: `http://127.0.0.1:${PORT + 1}`,
              apiaryApiKey: 'the-key',
              apiaryApiName: 'the-api-name',
              dreddRestDebug: '1',
            },
          },
        };

        dredd = new Dredd(configuration);

        const apiary = express();
        apiary.use(bodyParser.json({ size: '5mb' }));

        apiary.post('/apis/*', (req, res) => res.status(201).json({
          _id: '1234_id',
          testRunId: '6789_testRunId',
          reportUrl: 'http://url.me/test/run/1234_id',
        }));

        apiary.all('*', (req, res) => res.json({}));

        apiaryServer = apiary.listen((PORT + 1), () => done());
      });

      afterEach(done => apiaryServer.close(() => done()));


      it('should call the callback', (done) => {
        const callback = sinon.spy((error) => {
          if (error) { return done(error); }
          assert.isOk(callback.called);
          done();
        });

        dredd.emitStart(callback);
      });
    });

    describe('an error in the apiary reporter occurs', () => {
      const PORT = 9876;
      dredd = null;
      let errorLogger;

      beforeEach(() => {
        errorLogger = sinon.spy(loggerStub, 'error');
        configuration = {
          server: 'http://127.0.0.1:3000/',
          options: {

            reporter: ['apiary'],
            path: ['./test/fixtures/apiary.apib'],
            custom: {
              apiaryApiUrl: `http://127.0.0.1:${PORT + 1}`,
              apiaryApiKey: 'the-key',
              apiaryApiName: 'the-api-name',
              dreddRestDebug: '1',
            },
          },
        };

        dredd = new Dredd(configuration);
      });

      afterEach(() => loggerStub.error.restore());

      it('should call the callback without the error', (done) => {
        const callback = sinon.spy((error) => {
          assert.isNull(error);
          assert.isOk(callback.called);
          done();
        });
        dredd.emitStart(callback);
      });

      it('should print the error', done => dredd.emitStart(() => {
        assert.isTrue(errorLogger.called);
        done();
      }));
    });
  });

  describe('#logProxySettings', () => {
    let verboseLogger;

    beforeEach(() => { verboseLogger = sinon.spy(loggerStub, 'verbose'); });
    afterEach(() => loggerStub.verbose.restore());

    describe('when the proxy is set by lowercase environment variable', () => {
      beforeEach(() => {
        process.env.http_proxy = 'http://proxy.example.com';
        dredd = new Dredd({ options: {} });
      });
      afterEach(() => delete process.env.http_proxy);

      it('logs about the setting', () => assert.include(verboseLogger.lastCall.args[0],
        'HTTP(S) proxy specified by environment variables: http_proxy=http://proxy.example.com'));
    });

    describe('when the proxy is set by uppercase environment variable', () => {
      beforeEach(() => {
        process.env.HTTPS_PROXY = 'http://proxy.example.com';
        dredd = new Dredd({ options: {} });
      });
      afterEach(() => delete process.env.HTTPS_PROXY);

      it('logs about the setting', () => assert.include(verboseLogger.lastCall.args[0],
        'HTTP(S) proxy specified by environment variables: '
          + 'HTTPS_PROXY=http://proxy.example.com'));
    });

    describe('when NO_PROXY environment variable is set', () => {
      beforeEach(() => {
        process.env.HTTPS_PROXY = 'http://proxy.example.com';
        process.env.NO_PROXY = 'whitelisted.example.com';
        dredd = new Dredd({ options: {} });
      });
      afterEach(() => {
        delete process.env.HTTPS_PROXY;
        delete process.env.NO_PROXY;
      });

      it('logs about the setting', () => assert.include(verboseLogger.lastCall.args[0],
        'HTTP(S) proxy specified by environment variables: '
          + 'HTTPS_PROXY=http://proxy.example.com, '
          + 'NO_PROXY=whitelisted.example.com'));
    });

    describe('when DUMMY_PROXY environment variable is set', () => {
      beforeEach(() => {
        process.env.DUMMY_PROXY = 'http://proxy.example.com';
        process.env.NO_PROXY = 'whitelisted.example.com';
        dredd = new Dredd({ options: {} });
      });
      afterEach(() => {
        delete process.env.DUMMY_PROXY;
        delete process.env.NO_PROXY;
      });

      it('is ignored', () => assert.include(verboseLogger.lastCall.args[0],
        'HTTP(S) proxy specified by environment variables: '
          + 'NO_PROXY=whitelisted.example.com'));
    });
  });
});
