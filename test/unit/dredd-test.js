const {assert} = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();
const bodyParser = require('body-parser');
const express = require('express');

const fsStub = require('fs');
const requestStub = require('request');
const loggerStub = require('../../src/logger');

const dreddTransactionsStub = require('dredd-transactions');

const Dredd = proxyquire('../../src/dredd', {
  'request': requestStub,
  'dredd-transactions': dreddTransactionsStub,
  'fs': fsStub,
  './logger': loggerStub
});

describe('Dredd class', function() {

  let configuration = {};
  let dredd = {};

  beforeEach(() => sinon.spy(fsStub, 'readFile'));

  afterEach(() => fsStub.readFile.restore());

  describe('with legacy configuration', function() {
    before(function() {
      configuration = {
        server: 'http://127.0.0.1:3000/',
        blueprintPath: './test/fixtures/apiary.apib'
      };
      sinon.stub(loggerStub, 'info').callsFake( function() { });
      return sinon.stub(loggerStub, 'log').callsFake( function() { });
    });

    after(function() {
      loggerStub.info.restore();
      return loggerStub.log.restore();
    });

    return it('should not explode and run executeTransaction', function(done) {

      const fn = function() {
        dredd = new Dredd(configuration);
        sinon.stub(dredd.runner, 'executeTransaction').callsFake((transaction, hooks, callback) => callback());
        return dredd.run(function(error) {
          assert.isOk(dredd.runner.executeTransaction.called);
          dredd.runner.executeTransaction.restore();
          return done();
        });
      };

      return assert.doesNotThrow(fn);
    });
  });

  describe('with valid configuration', function() {
    before(() =>
      configuration = {
        server: 'http://127.0.0.1:3000/',
        options: {
          silent: true,
          method: 'get',
          header: 'Accept:application/json',
          user: 'bob:test',
          sorted: true,
          path: ['./test/fixtures/apiary.apib']
        }
      });

    it('should copy configuration on creation', function() {
      dredd = new Dredd(configuration);
      assert.isOk(dredd.configuration.options.silent);
      return assert.notOk(dredd.configuration.options['dry-run']);
    });

    it('should load the file on given path', function(done) {
      dredd = new Dredd(configuration);
      sinon.stub(dredd.runner, 'executeTransaction').callsFake((transaction, hooks, callback) => callback());
      return dredd.run(function(error) {
        assert.isOk(fsStub.readFile.calledWith(configuration.options.path[0]));
        dredd.runner.executeTransaction.restore();
        return done();
      });
    });

    it('should not pass any error to the callback function', function(done) {
      dredd = new Dredd(configuration);
      sinon.stub(dredd.runner, 'executeTransaction').callsFake((transaction, hooks, callback) => callback());
      return dredd.run(function(error) {
        assert.isNull(error);
        dredd.runner.executeTransaction.restore();
        return done();
      });
    });

    it('should pass the reporter as second argument', function(done) {
      dredd = new Dredd(configuration);
      sinon.stub(dredd.runner, 'executeTransaction').callsFake((transaction, hooks, callback) => callback());
      return dredd.run(function(error, reporter) {
        assert.isDefined(reporter);
        dredd.runner.executeTransaction.restore();
        return done();
      });
    });

    it('should convert ast to runtime', function(done) {
      sinon.spy(dreddTransactionsStub, 'compile');
      dredd = new Dredd(configuration);
      sinon.stub(dredd.runner, 'executeTransaction').callsFake((transaction, hooks, callback) => callback());
      return dredd.run(function(error) {
        assert.isOk(dreddTransactionsStub.compile.called);
        dredd.runner.executeTransaction.restore();
        return done();
      });
    });

    describe('when paths specified with glob paterns', function() {
      before(function() {
        configuration = {
          server: 'http://127.0.0.1:3000/',
          options: {
            silent: true,
            path: ['./test/fixtures/multifile/*.apib', './test/fixtures/multifile/*.apib']
          }
        };
        return dredd = new Dredd(configuration);
      });

      beforeEach(() =>
        sinon.stub(dredd.runner, 'executeTransaction').callsFake((transaction, hooks, callback) => callback())
      );

      afterEach(() => dredd.runner.executeTransaction.restore());

      it('should expand all glob patterns and resolved paths should be unique', done =>
        dredd.run(function(error) {
          if (error) { return done(error); }
          assert.equal(dredd.configuration.files.length, 3);
          assert.include(dredd.configuration.files, './test/fixtures/multifile/message.apib');
          return done();
        })
      );

      it('should remove globs from config', done =>
        dredd.run(function(error) {
          if (error) { return done(error); }
          assert.notInclude(dredd.configuration.files, './test/fixtures/multifile/*.apib');
          return done();
        })
      );

      it('should load file contents on paths to config', done =>
        dredd.run(function(error) {
          if (error) { return done(error); }
          assert.isObject(dredd.configuration.data);
          assert.property(dredd.configuration.data, './test/fixtures/multifile/greeting.apib');
          assert.isObject(dredd.configuration.data['./test/fixtures/multifile/greeting.apib']);
          assert.property(dredd.configuration.data['./test/fixtures/multifile/greeting.apib'], 'filename');
          assert.property(dredd.configuration.data['./test/fixtures/multifile/greeting.apib'], 'raw');
          return done();
        })
      );

      return it('should parse loaded files', done =>
        dredd.run(function(error) {
          if (error) { return done(error); }
          assert.isObject(dredd.configuration.data['./test/fixtures/multifile/greeting.apib']);
          assert.property(dredd.configuration.data['./test/fixtures/multifile/greeting.apib'], 'annotations');
          assert.property(dredd.configuration.data['./test/fixtures/multifile/greeting.apib'], 'filename');
          assert.property(dredd.configuration.data['./test/fixtures/multifile/greeting.apib'], 'raw');
          return done();
        })
      );
    });


    describe('when a glob pattern does not match any files and another does', function() {
      before(function() {
        configuration = {
          server: 'http://127.0.0.1:3000/',
          options: {
            silent: true,
            path: ['./test/fixtures/multifile/*.balony', './test/fixtures/multifile/*.apib']
          }
        };
        return dredd = new Dredd(configuration);
      });

      beforeEach(() =>
        sinon.stub(dredd.runner, 'executeTransaction').callsFake((transaction, hooks, callback) => callback())
      );

      afterEach(() => dredd.runner.executeTransaction.restore());

      return it('should return error', done =>
        dredd.run(function(error) {
          assert.isOk(error);
          return done();
        })
      );
    });


    describe('when glob pattern does not match any files', function() {
      before(function() {
        configuration = {
          server: 'http://127.0.0.1:3000/',
          options: {
            silent: true,
            path: ['./test/fixtures/multifile/*.balony']
          }
        };
        return dredd = new Dredd(configuration);
      });

      beforeEach(() =>
        sinon.stub(dredd.runner, 'executeTransaction').callsFake((transaction, hooks, callback) => callback())
      );

      afterEach(() => dredd.runner.executeTransaction.restore());

      return it('should return error', done =>
        dredd.run(function(error) {
          assert.isOk(error);
          return done();
        })
      );
    });


    describe('when configuration contains data object with "filename" as key, and an API description document contents as value', function() {
      beforeEach(function() {
        configuration = {
          server: 'http://127.0.0.1:3000/',
          options: {
            silent: true
          },
          data: {
            testingDirectObject: {
              filename: 'testingDirectObjectFilename',
              raw: `\
# API name

GET /url
+ Response 200 (application/json)

        {"a":"b"}'\
`
            },
            testingDirectBlueprintString: `\
# API name

GET /url
+ Response 200 (application/json)

        {"a":"b"}'\
`
          }
        };
        dredd = new Dredd(configuration);
        return sinon.stub(dredd.runner, 'executeTransaction').callsFake((transaction, hooks, callback) => callback());
      });

      afterEach(() => dredd.runner.executeTransaction.restore());

      it('should not expand any glob patterns', done =>
        dredd.run(function(error) {
          if (error) { return done(error); }
          assert.lengthOf(dredd.configuration.files, 0);
          return done();
        })
      );

      it('should pass data contents to config', done =>
        dredd.run(function(error) {
          if (error) { return done(error); }
          assert.isObject(dredd.configuration.data);
          assert.notNestedProperty(dredd, 'configuration.data.testingDirectObject');
          assert.nestedPropertyVal(dredd, 'configuration.data.testingDirectObjectFilename.filename', 'testingDirectObjectFilename');
          assert.nestedProperty(dredd, 'configuration.data.testingDirectObjectFilename.raw');
          assert.nestedPropertyVal(dredd, 'configuration.data.testingDirectBlueprintString.filename', 'testingDirectBlueprintString');
          assert.nestedProperty(dredd, 'configuration.data.testingDirectBlueprintString.raw');
          return done();
        })
      );

      it('should parse passed data contents', done =>
        dredd.run(function(error) {
          if (error) { return done(error); }
          assert.nestedProperty(dredd, 'configuration.data.testingDirectObjectFilename.annotations');
          assert.nestedProperty(dredd, 'configuration.data.testingDirectBlueprintString.annotations');
          return done();
        })
      );

      return describe('and I also set configuration.options.path to an existing file', function() {
        let localdredd = null;
        beforeEach(function() {
          if (configuration.options == null) { configuration.options = {}; }
          configuration.options.path = ['./test/fixtures/apiary.apib'];
          localdredd = new Dredd(configuration);
          return sinon.stub(localdredd.runner, 'executeTransaction').callsFake((transaction, hooks, callback) => callback());
        });

        afterEach(() => localdredd.runner.executeTransaction.restore());

        return it('should fill configuration data with data and one file at that path', done =>
          localdredd.run(function(error) {
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
            return done();
          })
        );
      });
    });


    return describe('when paths are specified as a mix of URLs and a glob path', function() {
      let blueprintCode = null;
      before(function(done) {
        configuration = {
          server: 'http://127.0.0.1:3000/',
          options: {
            silent: true,
            path: ['http://some.path.to/file.apib', 'https://another.path.to/apiary.apib', './test/fixtures/multifile/*.apib']
          }
        };
        dredd = new Dredd(configuration);
        return fsStub.readFile('./test/fixtures/single-get.apib', 'utf8', function(err, content) {
          blueprintCode = content.toString();
          return done(err);
        });
      });

      beforeEach(() =>
        sinon.stub(dredd.runner, 'executeTransaction').callsFake((transaction, hooks, callback) => callback())
      );

      afterEach(() => dredd.runner.executeTransaction.restore());

      describe('when all URLs can be downloaded', function() {
        before(() =>
          sinon.stub(requestStub, 'get').callsFake((receivedArgs = {}, cb) => cb(null, {statusCode:200}, blueprintCode))
        );

        after(() => requestStub.get.restore());

        it('should expand glob pattern and resolved paths should be unique', done =>
          dredd.run(function(error) {
            if (error) { return done(error); }
            assert.lengthOf(dredd.configuration.files, 5);
            assert.sameMembers(dredd.configuration.files, [
              'http://some.path.to/file.apib',
              'https://another.path.to/apiary.apib',
              './test/fixtures/multifile/message.apib',
              './test/fixtures/multifile/greeting.apib',
              './test/fixtures/multifile/name.apib'
            ]);
            return done();
          })
        );

        it('should remove globs from config', done =>
          dredd.run(function(error) {
            if (error) { return done(error); }
            assert.notInclude(dredd.configuration.files, './test/fixtures/multifile/*.apib');
            return done();
          })
        );

        return it('should load file contents on paths to config and parse these files', done =>
          dredd.run(function(error) {
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
            return done();
          })
        );
      });

      describe('when an URL for one API description document returns 404 not-found', function() {
        before(() =>
          sinon.stub(requestStub, 'get').callsFake(function(receivedArgs = {}, cb) {
            if ((receivedArgs != null ? receivedArgs.url : undefined) === 'https://another.path.to/apiary.apib') {
              return cb(null, {statusCode: 404}, 'Page Not Found');
            }
            return cb(null, {statusCode:200}, blueprintCode);
          })
        );

        after(() => requestStub.get.restore());

        it('should exit with an error', done =>
          dredd.run(function(error) {
            assert.isOk(error);
            assert.instanceOf(error, Error);
            assert.property(error, 'message');
            assert.include(error.message, 'Unable to load file from URL');
            return done();
          })
        );

        return it('should not execute any transaction', done =>
          dredd.run(function() {
            assert.notOk(dredd.runner.executeTransaction.called);
            return done();
          })
        );
      });

      return describe('when an URL for one API description document is unreachable (erroneous)', function() {
        before(() =>
          sinon.stub(requestStub, 'get').callsFake(function(receivedArgs = {}, cb) {
            if ((receivedArgs != null ? receivedArgs.url : undefined) === 'http://some.path.to/file.apib') {
              // server not found on
              return cb({code: 'ENOTFOUND'});
            }
            return cb(null, {statusCode:200}, blueprintCode);
          })
        );

        after(() => requestStub.get.restore());

        it('should exit with an error', done =>
          dredd.run(function(error) {
            assert.isOk(error);
            assert.instanceOf(error, Error);
            assert.property(error, 'message');
            assert.include(error.message, 'Error when loading file from URL');
            return done();
          })
        );

        return it('should not execute any transaction', done =>
          dredd.run(function() {
            assert.notOk(dredd.runner.executeTransaction.called);
            return done();
          })
        );
      });
    });
  });

  describe('when API description document parsing error', function() {
    before(function() {
      configuration = {
        url: 'http://127.0.0.1:3000/',
        options: {
          silent: true,
          path: ['./test/fixtures/error-blueprint.apib']
        }
      };
      return dredd = new Dredd(configuration);
    });

    beforeEach(() =>
      sinon.stub(dredd.runner, 'executeTransaction').callsFake((transaction, hooks, callback) => callback())
    );

    afterEach(() => dredd.runner.executeTransaction.restore());

    it('should exit with an error', done =>
      dredd.run(function(error) {
        assert.isOk(error);
        return done();
      })
    );

    return it('should NOT execute any transaction', done =>
      dredd.run(function() {
        assert.notOk(dredd.runner.executeTransaction.called);
        return done();
      })
    );
  });

  describe('when API description document parsing warning', function() {
    before(function() {
      configuration = {
        url: 'http://127.0.0.1:3000/',
        options: {
          silent: true,
          path: ['./test/fixtures/warning-ambiguous.apib']
        }
      };
      return dredd = new Dredd(configuration);
    });

    beforeEach(function() {
      sinon.stub(dredd.runner, 'run').callsFake((transaction, callback) => callback());
      return sinon.spy(loggerStub, 'warn');
    });

    afterEach(function() {
      dredd.runner.run.restore();
      return loggerStub.warn.restore();
    });

    it('should execute the runtime', done =>
      dredd.run(function() {
        assert.isOk(dredd.runner.run.called);
        return done();
      })
    );

    return it('should write warnings to warn logger', done =>
      dredd.run(function() {
        assert.isOk(loggerStub.warn.called);
        return done();
      })
    );
  });

  describe('when non existing API description document path', function() {
    beforeEach(function() {
      configuration = {
        url: 'http://127.0.0.1:3000/',
        options: {
          silent: true,
          path: ['./balony/path.apib']
        }
      };
      dredd = new Dredd(configuration);
      return sinon.stub(dredd.runner, 'executeTransaction').callsFake((transaction, hooks, callback) => callback());
    });

    afterEach(() => dredd.runner.executeTransaction.reset());

    it('should pass the error to the callback function', done =>
      dredd.run(function(error) {
        assert.isOk(error);
        return done();
      })
    );

    return it('should NOT execute any transaction', done =>
      dredd.run(function(error) {
        assert.notOk(dredd.runner.executeTransaction.called);
        return done();
      })
    );
  });

  describe('when runtime contains any error', function() {
    beforeEach(function() {
      configuration = {
        server: 'http://127.0.0.1:3000/',
        options: {
          silent: true,
          path: ['./test/fixtures/error-uri-template.apib']
        }
      };

      dredd = new Dredd(configuration);
      return sinon.stub(dredd.runner, 'executeTransaction').callsFake((transaction, hooks, callback) => callback());
    });

    afterEach(() => dredd.runner.executeTransaction.reset());

    it('should NOT execute any transaction', done =>
      dredd.run(function(error) {
        assert.notOk(dredd.runner.executeTransaction.called);
        return done();
      })
    );

    return it('should exit with an error', done =>
      dredd.run(function(error) {
        assert.isOk(error);
        return done();
      })
    );
  });

  describe('when runtime contains any warning', function() {
    beforeEach(function() {
      configuration = {
        server: 'http://127.0.0.1:3000/',
        options: {
          silent: true,
          path: ['./test/fixtures/warning-ambiguous.apib']
        }
      };
      sinon.spy(loggerStub, 'warn');
      dredd = new Dredd(configuration);
      return sinon.stub(dredd.runner, 'executeTransaction').callsFake((transaction, hooks, callback) => callback());
    });

    afterEach(function() {
      dredd.runner.executeTransaction.reset();
      return loggerStub.warn.restore();
    });

    it('should execute some transaction', done =>
      dredd.run(function(error) {
        assert.isOk(dredd.runner.executeTransaction.called);
        return done();
      })
    );

    it('should print runtime warnings to stdout', done =>
      dredd.run(function(error) {
        assert.isOk(loggerStub.warn.called);
        return done();
      })
    );

    return it('should not exit', done =>
      dredd.run(function(error) {
        assert.notOk(error);
        return done();
      })
    );
  });

  describe('when runtime is without errors and warnings', function() {
    beforeEach(function() {
      configuration = {
        server: 'http://127.0.0.1:3000/',
        options: {
          silent: true,
          path: ['./test/fixtures/apiary.apib']
        }
      };
      dredd = new Dredd(configuration);
      return sinon.stub(dredd.runner, 'executeTransaction').callsFake((transaction, hooks, callback) => callback());
    });

    afterEach(() => dredd.runner.executeTransaction.reset());

    return it('should execute the runtime', done =>
      dredd.run(function(error) {
        assert.isOk(dredd.runner.executeTransaction.called);
        return done();
      })
    );
  });

  describe("#emitStart", function() {

    describe('no error in reporter occurs', function() {
      const PORT = 9876;
      dredd = null;
      let apiaryServer = null;

      beforeEach(function(done) {
        configuration = {
          server: 'http://127.0.0.1:3000/',
          options: {
            silent: true,
            reporter: ['apiary'],
            path: ['./test/fixtures/apiary.apib'],
            custom: {
              apiaryApiUrl: `http://127.0.0.1:${PORT+1}`,
              apiaryApiKey: 'the-key',
              apiaryApiName: 'the-api-name',
              dreddRestDebug: '1'
            }
          }
        };

        dredd = new Dredd(configuration);

        const apiary = express();
        apiary.use(bodyParser.json({size:'5mb'}));

        apiary.post('/apis/*', (req, res) =>
          res.status(201).json({
            _id: '1234_id',
            testRunId: '6789_testRunId',
            reportUrl: 'http://url.me/test/run/1234_id'
          })
        );

        apiary.all('*', (req, res) => res.json({}));

        return apiaryServer = apiary.listen((PORT+1), () => done());
      });

      afterEach(done =>
        apiaryServer.close(() => done())
      );


      return it('should call the callback', function(done) {
        var callback = sinon.spy(function(error) {
          if (error) { done(error); }
          assert.isOk(callback.called);
          return done();
        });

        return dredd.emitStart(callback);
      });
    });

    return describe('an error in the apiary reporter occurs', function() {
      const PORT = 9876;
      dredd = null;
      const apiaryServer = null;
      let errorLogger = undefined;

      beforeEach(function() {
        errorLogger = sinon.spy(loggerStub, 'error');
        configuration = {
          server: 'http://127.0.0.1:3000/',
          options: {

            reporter: ['apiary'],
            path: ['./test/fixtures/apiary.apib'],
            custom: {
              apiaryApiUrl: `http://127.0.0.1:${PORT+1}`,
              apiaryApiKey: 'the-key',
              apiaryApiName: 'the-api-name',
              dreddRestDebug: '1'
            }
          }
        };

        return dredd = new Dredd(configuration);
      });

      afterEach(() => loggerStub.error.restore());

      it('should call the callback without the error', function(done) {
        var callback = sinon.spy(function(error) {
          assert.isNull(error);
          assert.isOk(callback.called);
          return done();
        });
        return dredd.emitStart(callback);
      });

      return it('should print the error', done =>
        dredd.emitStart(function() {
          assert.isTrue(errorLogger.called);
          return done();
        })
      );
    });
  });

  return describe('#logProxySettings', function() {
    let verboseLogger = undefined;

    beforeEach( () => verboseLogger = sinon.spy(loggerStub, 'verbose'));
    afterEach( () => loggerStub.verbose.restore());

    describe('when the proxy is set by lowercase environment variable', function() {
      beforeEach( function() {
        process.env.http_proxy = 'http://proxy.example.com';
        return dredd = new Dredd({options: {}});
      });
      afterEach( () => delete process.env.http_proxy);

      return it('logs about the setting', () =>
        assert.include(verboseLogger.lastCall.args[0],
          'HTTP(S) proxy specified by environment variables: http_proxy=http://proxy.example.com'
        )
      );
    });

    describe('when the proxy is set by uppercase environment variable', function() {
      beforeEach( function() {
        process.env.HTTPS_PROXY = 'http://proxy.example.com';
        return dredd = new Dredd({options: {}});
      });
      afterEach( () => delete process.env.HTTPS_PROXY);

      return it('logs about the setting', () =>
        assert.include(verboseLogger.lastCall.args[0],
          'HTTP(S) proxy specified by environment variables: ' +
          'HTTPS_PROXY=http://proxy.example.com'
        )
      );
    });

    describe('when NO_PROXY environment variable is set', function() {
      beforeEach( function() {
        process.env.HTTPS_PROXY = 'http://proxy.example.com';
        process.env.NO_PROXY = 'whitelisted.example.com';
        return dredd = new Dredd({options: {}});
      });
      afterEach( function() {
        delete process.env.HTTPS_PROXY;
        return delete process.env.NO_PROXY;
      });

      return it('logs about the setting', () =>
        assert.include(verboseLogger.lastCall.args[0],
          'HTTP(S) proxy specified by environment variables: ' +
          'HTTPS_PROXY=http://proxy.example.com, ' +
          'NO_PROXY=whitelisted.example.com'
        )
      );
    });

    return describe('when DUMMY_PROXY environment variable is set', function() {
      beforeEach( function() {
        process.env.DUMMY_PROXY = 'http://proxy.example.com';
        process.env.NO_PROXY = 'whitelisted.example.com';
        return dredd = new Dredd({options: {}});
      });
      afterEach( function() {
        delete process.env.DUMMY_PROXY;
        return delete process.env.NO_PROXY;
      });

      return it('is ignored', () =>
        assert.include(verboseLogger.lastCall.args[0],
          'HTTP(S) proxy specified by environment variables: ' +
          'NO_PROXY=whitelisted.example.com'
        )
      );
    });
  });
});
