const fsStub = require('fs');
const proxyquire = require('proxyquire').noCallThru();
const requestStub = require('request');
const sinon = require('sinon');
const path = require('path');
const { assert } = require('chai');
const parse = require('dredd-transactions/parse');
const compile = require('dredd-transactions/compile');

const loggerStub = require('../../lib/logger');

const parseStub = sinon.spy(parse);
const compileStub = sinon.spy(compile);

const Dredd = proxyquire('../../lib/Dredd', {
  request: requestStub,
  'dredd-transactions/parse': parseStub,
  'dredd-transactions/compile': compileStub,
  fs: fsStub,
  './logger': loggerStub,
});


function compareLocation(ad1, ad2) {
  if (ad1.location < ad2.location) { return -1; }
  if (ad1.location > ad2.location) { return 1; }
  return 0;
}


describe('Dredd class', () => {
  const workingDirectory = process.cwd();
  let configuration = {};
  let dredd = {};

  beforeEach(() => sinon.spy(fsStub, 'readFile'));

  afterEach(() => fsStub.readFile.restore());

  describe('with valid configuration', () => {
    before(() => {
      configuration = {
        server: 'http://127.0.0.1:3000/',
        options: {
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
      assert.isOk(dredd.configuration.options.sorted);
      assert.notOk(dredd.configuration.options['dry-run']);
    });

    it('should load the file on given path', (done) => {
      dredd = new Dredd(configuration);
      sinon.stub(dredd.transactionRunner, 'executeTransaction').callsFake((transaction, hooks, callback) => callback());
      dredd.run(() => {
        assert.isOk(fsStub.readFile.calledWith(path.join(workingDirectory, '/test/fixtures/apiary.apib')));
        dredd.transactionRunner.executeTransaction.restore();
        done();
      });
    });

    it('should not pass any error to the callback function', (done) => {
      dredd = new Dredd(configuration);
      sinon.stub(dredd.transactionRunner, 'executeTransaction').callsFake((transaction, hooks, callback) => callback());
      dredd.run((error) => {
        assert.isNotOk(error);
        dredd.transactionRunner.executeTransaction.restore();
        done();
      });
    });

    it('should pass the stats as second argument', (done) => {
      dredd = new Dredd(configuration);
      sinon.stub(dredd.transactionRunner, 'executeTransaction').callsFake((transaction, hooks, callback) => callback());
      dredd.run((error, stats) => {
        assert.isDefined(stats);
        dredd.transactionRunner.executeTransaction.restore();
        done();
      });
    });

    it('should convert ast to runtime', (done) => {
      dredd = new Dredd(configuration);
      sinon.stub(dredd.transactionRunner, 'executeTransaction').callsFake((transaction, hooks, callback) => callback());
      dredd.run(() => {
        assert.isOk(parseStub.called);
        assert.isOk(compileStub.called);
        dredd.transactionRunner.executeTransaction.restore();
        done();
      });
    });

    describe('when paths specified with glob paterns', () => {
      beforeEach(() => {
        configuration = {
          server: 'http://127.0.0.1:3000/',
          options: {
            path: ['./test/fixtures/multifile/*.apib', './test/fixtures/multifile/*.apib'],
          },
        };
        dredd = new Dredd(configuration);
        sinon
          .stub(dredd.transactionRunner, 'executeTransaction')
          .callsFake((transaction, hooks, callback) => callback());
      });
      afterEach(() => dredd.transactionRunner.executeTransaction.restore());

      it('should expand all glob patterns and resolved paths should be unique', done => dredd.run((error) => {
        if (error) { return done(error); }
        assert.lengthOf(dredd.files, 3);
        assert.deepEqual(dredd.files, [
          path.join(workingDirectory, '/test/fixtures/multifile/greeting.apib'),
          path.join(workingDirectory, '/test/fixtures/multifile/message.apib'),
          path.join(workingDirectory, '/test/fixtures/multifile/name.apib'),
        ]);
        done();
      }));

      it('should remove globs from config', done => dredd.run((error) => {
        if (error) { return done(error); }
        assert.notInclude(dredd.files, 'test/fixtures/multifile/*.apib');
        done();
      }));

      it('should load file contents on paths to config', done => dredd.run((error) => {
        if (error) { return done(error); }
        assert.lengthOf(dredd.configuration.apiDescriptions, 3);
        dredd.configuration.apiDescriptions.sort(compareLocation);

        assert.isObject(dredd.configuration.apiDescriptions[0]);
        assert.propertyVal(dredd.configuration.apiDescriptions[0], 'location', path.join(workingDirectory, '/test/fixtures/multifile/greeting.apib'));
        assert.property(dredd.configuration.apiDescriptions[0], 'content');

        assert.isObject(dredd.configuration.apiDescriptions[1]);
        assert.propertyVal(dredd.configuration.apiDescriptions[1], 'location', path.join(workingDirectory, '/test/fixtures/multifile/message.apib'));
        assert.property(dredd.configuration.apiDescriptions[1], 'content');

        assert.isObject(dredd.configuration.apiDescriptions[2]);
        assert.propertyVal(dredd.configuration.apiDescriptions[2], 'location', path.join(workingDirectory, '/test/fixtures/multifile/name.apib'));
        assert.property(dredd.configuration.apiDescriptions[2], 'content');
        done();
      }));

      it('should parse loaded files', done => dredd.run((error) => {
        if (error) { return done(error); }
        assert.lengthOf(dredd.configuration.apiDescriptions, 3);
        dredd.configuration.apiDescriptions.sort(compareLocation);

        assert.property(dredd.configuration.apiDescriptions[0], 'annotations');
        assert.property(dredd.configuration.apiDescriptions[1], 'annotations');
        assert.property(dredd.configuration.apiDescriptions[2], 'annotations');
        done();
      }));
    });


    describe('when a glob pattern does not match any files and another does', () => {
      before(() => {
        configuration = {
          server: 'http://127.0.0.1:3000/',
          options: {

            path: ['./test/fixtures/multifile/*.balony', './test/fixtures/multifile/*.apib'],
          },
        };
        dredd = new Dredd(configuration);
      });

      beforeEach(() => sinon.stub(dredd.transactionRunner, 'executeTransaction').callsFake((transaction, hooks, callback) => callback()));

      afterEach(() => dredd.transactionRunner.executeTransaction.restore());

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

            path: ['./test/fixtures/multifile/*.balony'],
          },
        };
        dredd = new Dredd(configuration);
      });

      beforeEach(() => sinon.stub(dredd.transactionRunner, 'executeTransaction').callsFake((transaction, hooks, callback) => callback()));

      afterEach(() => dredd.transactionRunner.executeTransaction.restore());

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
        sinon.stub(dredd.transactionRunner, 'executeTransaction').callsFake((transaction, hooks, callback) => callback());
      });

      afterEach(() => dredd.transactionRunner.executeTransaction.restore());

      it('should not expand any glob patterns', done => dredd.run((error) => {
        if (error) { return done(error); }
        assert.lengthOf(dredd.files, 0);
        done();
      }));

      it('should pass data contents to config', done => dredd.run((error) => {
        if (error) { return done(error); }
        assert.lengthOf(dredd.configuration.apiDescriptions, 2);
        dredd.configuration.apiDescriptions.sort(compareLocation);

        assert.isObject(dredd.configuration.apiDescriptions[0]);
        assert.propertyVal(dredd.configuration.apiDescriptions[0], 'location', 'testingDirectBlueprintString');
        assert.property(dredd.configuration.apiDescriptions[0], 'content');
        assert.property(dredd.configuration.apiDescriptions[0], 'annotations');

        assert.isObject(dredd.configuration.apiDescriptions[1]);
        assert.propertyVal(dredd.configuration.apiDescriptions[1], 'location', 'testingDirectObjectFilename');
        assert.property(dredd.configuration.apiDescriptions[1], 'content');
        assert.property(dredd.configuration.apiDescriptions[1], 'annotations');
        done();
      }));

      describe('and I also set configuration.options.path to an existing file', () => {
        let localdredd;
        beforeEach(() => {
          if (!configuration.options) { configuration.options = {}; }
          configuration.options.path = ['./test/fixtures/apiary.apib'];
          localdredd = new Dredd(configuration);
          sinon.stub(localdredd.transactionRunner, 'executeTransaction').callsFake((transaction, hooks, callback) => callback());
        });

        afterEach(() => localdredd.transactionRunner.executeTransaction.restore());

        it('should fill configuration data with data and one file at that path', done => localdredd.run((error) => {
          if (error) { return done(error); }
          assert.lengthOf(localdredd.files, 1);
          assert.lengthOf(localdredd.configuration.apiDescriptions, 3);

          assert.isObject(localdredd.configuration.apiDescriptions[0]);
          assert.propertyVal(localdredd.configuration.apiDescriptions[0], 'location', 'testingDirectObjectFilename');
          assert.property(localdredd.configuration.apiDescriptions[0], 'content');
          assert.property(localdredd.configuration.apiDescriptions[0], 'annotations');

          assert.isObject(localdredd.configuration.apiDescriptions[1]);
          assert.propertyVal(localdredd.configuration.apiDescriptions[1], 'location', 'testingDirectBlueprintString');
          assert.property(localdredd.configuration.apiDescriptions[1], 'content');
          assert.property(localdredd.configuration.apiDescriptions[1], 'annotations');

          assert.isObject(localdredd.configuration.apiDescriptions[2]);
          assert.propertyVal(localdredd.configuration.apiDescriptions[2], 'location', path.join(workingDirectory, '/test/fixtures/apiary.apib'));
          assert.property(localdredd.configuration.apiDescriptions[2], 'content');
          assert.property(localdredd.configuration.apiDescriptions[2], 'annotations');
          done();
        }));
      });
    });


    describe('when paths are specified as a mix of URLs and a glob path', () => {
      let blueprintCode;
      beforeEach((done) => {
        configuration = {
          server: 'http://127.0.0.1:3000/',
          options: {
            path: ['http://some.path.to/file.apib', 'https://another.path.to/apiary.apib', './test/fixtures/multifile/*.apib'],
          },
        };
        dredd = new Dredd(configuration);
        fsStub.readFile('./test/fixtures/single-get.apib', 'utf8', (err, content) => {
          blueprintCode = content.toString();
          done(err);
        });
        sinon
          .stub(dredd.transactionRunner, 'executeTransaction')
          .callsFake((transaction, hooks, callback) => callback());
      });

      afterEach(() => dredd.transactionRunner.executeTransaction.restore());

      describe('when all URLs can be downloaded', () => {
        before(() =>
          // eslint-disable-next-line
          sinon.stub(requestStub, 'get').callsFake((receivedArgs = {}, cb) => cb(null, { statusCode: 200 }, blueprintCode)));

        after(() => requestStub.get.restore());

        it('should expand glob pattern and resolved paths should be unique', done => dredd.run((error) => {
          if (error) { return done(error); }
          assert.lengthOf(dredd.files, 5);
          assert.deepEqual(dredd.files, [
            'http://some.path.to/file.apib',
            'https://another.path.to/apiary.apib',
            path.join(workingDirectory, '/test/fixtures/multifile/greeting.apib'),
            path.join(workingDirectory, '/test/fixtures/multifile/message.apib'),
            path.join(workingDirectory, '/test/fixtures/multifile/name.apib'),
          ]);
          done();
        }));

        it('should remove globs from config', done => dredd.run((error) => {
          if (error) { return done(error); }
          assert.notInclude(dredd.files, 'test/fixtures/multifile/*.apib');
          done();
        }));

        it('should load file contents on paths to config and parse these files', done => dredd.run((error) => {
          if (error) { return done(error); }
          assert.lengthOf(dredd.configuration.apiDescriptions, 5);
          dredd.configuration.apiDescriptions.sort(compareLocation);

          assert.isObject(dredd.configuration.apiDescriptions[0]);
          assert.propertyVal(dredd.configuration.apiDescriptions[0], 'location', path.join(workingDirectory, '/test/fixtures/multifile/greeting.apib'));
          assert.property(dredd.configuration.apiDescriptions[0], 'content');
          assert.property(dredd.configuration.apiDescriptions[0], 'annotations');

          assert.isObject(dredd.configuration.apiDescriptions[1]);
          assert.propertyVal(dredd.configuration.apiDescriptions[1], 'location', path.join(workingDirectory, '/test/fixtures/multifile/message.apib'));
          assert.property(dredd.configuration.apiDescriptions[1], 'content');
          assert.property(dredd.configuration.apiDescriptions[1], 'annotations');

          assert.isObject(dredd.configuration.apiDescriptions[2]);
          assert.propertyVal(dredd.configuration.apiDescriptions[2], 'location', path.join(workingDirectory, '/test/fixtures/multifile/name.apib'));
          assert.property(dredd.configuration.apiDescriptions[2], 'content');
          assert.property(dredd.configuration.apiDescriptions[2], 'annotations');

          assert.isObject(dredd.configuration.apiDescriptions[3]);
          assert.propertyVal(dredd.configuration.apiDescriptions[3], 'location', 'http://some.path.to/file.apib');
          assert.property(dredd.configuration.apiDescriptions[3], 'content');
          assert.property(dredd.configuration.apiDescriptions[3], 'annotations');

          assert.isObject(dredd.configuration.apiDescriptions[4]);
          assert.propertyVal(dredd.configuration.apiDescriptions[4], 'location', 'https://another.path.to/apiary.apib');
          assert.property(dredd.configuration.apiDescriptions[4], 'content');
          assert.property(dredd.configuration.apiDescriptions[4], 'annotations');

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
          assert.notOk(dredd.transactionRunner.executeTransaction.called);
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
          assert.notOk(dredd.transactionRunner.executeTransaction.called);
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
          path: ['./test/fixtures/error-blueprint.apib'],
        },
      };
      dredd = new Dredd(configuration);
    });

    beforeEach(() => sinon.stub(dredd.transactionRunner, 'executeTransaction').callsFake((transaction, hooks, callback) => callback()));

    afterEach(() => dredd.transactionRunner.executeTransaction.restore());

    it('should exit with an error', done => dredd.run((error) => {
      assert.isOk(error);
      done();
    }));

    it('should NOT execute any transaction', done => dredd.run(() => {
      assert.notOk(dredd.transactionRunner.executeTransaction.called);
      done();
    }));
  });

  describe('when API description document parsing warning', () => {
    before(() => {
      configuration = {
        url: 'http://127.0.0.1:3000/',
        options: {
          path: ['./test/fixtures/warning-ambiguous.apib'],
        },
      };
      dredd = new Dredd(configuration);
    });

    beforeEach(() => {
      sinon.stub(dredd.transactionRunner, 'run').callsFake((transaction, callback) => callback());
      sinon.spy(loggerStub, 'warn');
    });

    afterEach(() => {
      dredd.transactionRunner.run.restore();
      loggerStub.warn.restore();
    });

    it('should execute the runtime', done => dredd.run(() => {
      assert.isOk(dredd.transactionRunner.run.called);
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
          path: ['./balony/path.apib'],
        },
      };
      dredd = new Dredd(configuration);
      sinon.stub(dredd.transactionRunner, 'executeTransaction').callsFake((transaction, hooks, callback) => callback());
    });

    afterEach(() => dredd.transactionRunner.executeTransaction.resetHistory());

    it('should pass the error to the callback function', done => dredd.run((error) => {
      assert.isOk(error);
      done();
    }));

    it('should NOT execute any transaction', done => dredd.run(() => {
      assert.notOk(dredd.transactionRunner.executeTransaction.called);
      done();
    }));
  });

  describe('when runtime contains any error', () => {
    beforeEach(() => {
      configuration = {
        server: 'http://127.0.0.1:3000/',
        options: {
          path: ['./test/fixtures/error-uri-template.apib'],
        },
      };

      dredd = new Dredd(configuration);
      sinon.stub(dredd.transactionRunner, 'executeTransaction').callsFake((transaction, hooks, callback) => callback());
    });

    afterEach(() => dredd.transactionRunner.executeTransaction.resetHistory());

    it('should NOT execute any transaction', done => dredd.run(() => {
      assert.notOk(dredd.transactionRunner.executeTransaction.called);
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
          path: ['./test/fixtures/warning-ambiguous.apib'],
        },
      };
      sinon.spy(loggerStub, 'warn');
      dredd = new Dredd(configuration);
      sinon.stub(dredd.transactionRunner, 'executeTransaction').callsFake((transaction, hooks, callback) => callback());
    });

    afterEach(() => {
      dredd.transactionRunner.executeTransaction.resetHistory();
      loggerStub.warn.restore();
    });

    it('should execute some transaction', done => dredd.run(() => {
      assert.isOk(dredd.transactionRunner.executeTransaction.called);
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
          path: ['./test/fixtures/apiary.apib'],
        },
      };
      dredd = new Dredd(configuration);
      sinon.stub(dredd.transactionRunner, 'executeTransaction').callsFake((transaction, hooks, callback) => callback());
    });

    afterEach(() => dredd.transactionRunner.executeTransaction.resetHistory());

    it('should execute the runtime', done => dredd.run(() => {
      assert.isOk(dredd.transactionRunner.executeTransaction.called);
      done();
    }));
  });
});
