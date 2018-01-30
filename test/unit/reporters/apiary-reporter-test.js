const {assert} = require('chai');
const {EventEmitter} = require('events');
const proxyquire = require('proxyquire');
const nock = require('nock');
nock.enableNetConnect();
const clone = require('clone');
const sinon = require('sinon');
const loggerStub = require('../../../src/logger');

const ApiaryReporter = proxyquire('../../../src/reporters/apiary-reporter', {
  './../logger': loggerStub
});

const PORT = 9876;

const blueprintData = require('../../fixtures/blueprint-data');

describe('ApiaryReporter', function() {
  let env = {};
  beforeEach(function() {
    sinon.stub(loggerStub, 'info');
    sinon.stub(loggerStub, 'complete');
    sinon.stub(loggerStub, 'error');
    sinon.stub(loggerStub, 'warn');
    sinon.stub(loggerStub, 'log');
    return sinon.stub(loggerStub, 'verbose');
  });

  afterEach(function() {
    sinon.stub(loggerStub.info.restore());
    sinon.stub(loggerStub.complete.restore());
    sinon.stub(loggerStub.error.restore());
    sinon.stub(loggerStub.warn.restore());
    sinon.stub(loggerStub.log.restore());
    return sinon.stub(loggerStub.verbose.restore());
  });

  before(() => nock.disableNetConnect());

  after(() => nock.enableNetConnect());

  describe('without API key or without suite', function() {
    let stats = {};
    let tests = [];
    let test = {};
    let emitter = {};

    beforeEach(function(done) {
      stats = {
        tests: 0,
        failures: 0,
        errors: 0,
        passes: 0,
        skipped: 0,
        start: 0,
        end: 0,
        duration: 0
      };
      tests = [];
      emitter = new EventEmitter;
      env = {'CIRCLE_VARIABLE': 'CIRCLE_VALUE'};
      env['APIARY_API_URL'] = `https://127.0.0.1:${PORT}`;
      delete env['APIARY_API_KEY'];
      delete env['APIARY_API_NAME'];

      test = {
        status: "fail",
        title: "POST /machines",
        message: "headers: Value of the ‘content-type’ must be application/json.\nbody: No validator found for real data media type 'text/plain' and expected data media type 'application/json'.\nstatusCode: Real and expected data does not match.\n",

        startedAt: (1234567890 * 1000), // JavaScript Date.now() timestamp (UNIX-like timestamp * 1000 precision)

        origin: {
          filename: './test/fixtures/multifile/greeting.apib',
          apiName: 'Greeting API',
          resourceGroupName: '',
          resourceName: '/greeting',
          actionName: 'GET',
          exampleName: ''
        },

        actual: {
          statusCode: 400,
          headers: {
            "content-type": "text/plain"
          },

          body: "Foo bar"
        },

        expected: {
          headers: {
            "content-type": "application/json"
          },

          body: "{\n  \"type\": \"bulldozer\",\n  \"name\": \"willy\",\n  \"id\": \"5229c6e8e4b0bd7dbb07e29c\"\n}\n",
          status: "202"
        },

        request: {
          body: "{\n  \"type\": \"bulldozer\",\n  \"name\": \"willy\"}\n",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "Dredd/0.2.1 (Darwin 13.0.0; x64)",
            "Content-Length": 44
          },

          uri: "/machines",
          method: "POST"
        },

        results: {
          headers: {
            results: [{
              pointer: "/content-type",
              severity: "error",
              message: "Value of the ‘content-type’ must be application/json."
            }
            ],
            realType: "application/vnd.apiary.http-headers+json",
            expectedType: "application/vnd.apiary.http-headers+json",
            validator: "HeadersJsonExample",
            rawData: {
              0: {
                property: ["content-type"],
                propertyValue: "text/plain",
                attributeName: "enum",
                attributeValue: ["application/json"],
                message: "Value of the ‘content-type’ must be application/json.",
                validator: "enum",
                validatorName: "enum",
                validatorValue: ["application/json"]
              },

              length: 1
            }
          },

          body: {
            results: [{
              message: "No validator found for real data media type 'text/plain' and expected data media type 'application/json'.",
              severity: "error"
            }
            ],
            realType: "text/plain",
            expectedType: "application/json",
            validator: null,
            rawData: null
          },

          statusCode: {
            realType: "text/vnd.apiary.status-code",
            expectedType: "text/vnd.apiary.status-code",
            validator: "TextDiff",
            rawData: "@@ -1,3 +1,9 @@\n-400\n+undefined\n",
            results: [{
              severity: "error",
              message: "Real and expected data does not match."
            }
            ]
          }
        }
      };

      nock.disableNetConnect();

      return done();
    });

    afterEach(function(done) {
      nock.enableNetConnect();
      nock.cleanAll();
      return done();
    });

    describe('constructor', function() {
      describe('when custom settings contain API URL without trailing slash', function() {
        const custom = {
          apiaryReporterEnv: env,
          apiaryApiUrl: 'https://api.example.com:1234'
        };

        return it('uses the provided API URL in configuration', function() {
          emitter = new EventEmitter;
          const apiaryReporter = new ApiaryReporter(emitter, {}, {}, {custom});
          return assert.equal(
            apiaryReporter.configuration.apiUrl,
            'https://api.example.com:1234'
          );
        });
      });

      return describe('when custom settings contain API URL with trailing slash', function() {
        const custom = {
          apiaryReporterEnv: env,
          apiaryApiUrl: 'https://api.example.com:1234/'
        };

        return it('uses the provided API URL in configuration, without trailing slash', function() {
          emitter = new EventEmitter;
          const apiaryReporter = new ApiaryReporter(emitter, {}, {}, {custom});
          return assert.equal(
            apiaryReporter.configuration.apiUrl,
            'https://api.example.com:1234'
          );
        });
      });
    });

    describe("_performRequestAsync", function() {
      describe('when custom settings contain API URL without trailing slash', function() {
        const custom = {
          apiaryReporterEnv: env,
          apiaryApiUrl: 'https://api.example.com:1234'
        };

        return it('should use API URL without double slashes', function(done) {
          emitter = new EventEmitter;
          const apiaryReporter = new ApiaryReporter(emitter, {}, {}, {custom});
          return apiaryReporter._performRequestAsync('/', 'POST', '', function(error) {
            assert.isOk(loggerStub.verbose.calledWithMatch('POST https://api.example.com:1234/ (without body)'));
            return done();
          });
        });
      });

      describe('when custom settings contain API URL with trailing slash', function() {
        const custom = {
          apiaryReporterEnv: env,
          apiaryApiUrl: 'https://api.example.com:1234/'
        };

        describe('when provided with root path', () =>
          it('should use API URL without double slashes', function(done) {
            emitter = new EventEmitter;
            const apiaryReporter = new ApiaryReporter(emitter, {}, {}, {custom});
            return apiaryReporter._performRequestAsync('/', 'POST', '', function(error) {
              assert.isOk(loggerStub.verbose.calledWithMatch('POST https://api.example.com:1234/ (without body)'));
              return done();
            });
          })
        );

        return describe('when provided with non-root path', () =>
          it('should use API URL without double slashes', function(done) {
            emitter = new EventEmitter;
            const apiaryReporter = new ApiaryReporter(emitter, {}, {}, {custom});
            return apiaryReporter._performRequestAsync('/hello?q=1', 'POST', '', function(error) {
              assert.isOk(loggerStub.verbose.calledWithMatch('POST https://api.example.com:1234/hello?q=1 (without body)'));
              return done();
            });
          })
        );
      });

      return describe('when server is not available', function() {
        beforeEach(function() {
          nock.enableNetConnect();
          return nock.cleanAll();
        });

        it('should log human readable message', function(done) {
          emitter = new EventEmitter;
          const apiaryReporter = new ApiaryReporter(emitter, {}, {}, {custom:{apiaryReporterEnv:env}});
          return apiaryReporter._performRequestAsync('/', 'POST', '', function(error) {
            assert.isNotNull(error);
            return done();
          });
        });

        return it('should set server error to true', function(done) {
          emitter = new EventEmitter;
          const apiaryReporter = new ApiaryReporter(emitter, {}, {}, {custom:{apiaryReporterEnv:env}});
          return apiaryReporter._performRequestAsync('/', 'POST', '', function() {
            assert.isTrue(apiaryReporter.serverError);
            return done();
          });
        });
      });
    });

    describe('when starting', function() {
      let call = null;
      const runId = '507f1f77bcf86cd799439011';
      let requestBody = null;
      beforeEach(function() {
        requestBody = null;
        const uri = '/apis/public/tests/runs';
        const reportUrl = "https://absolutely.fancy.url/wich-can-change/some/id";

        // this is a hack how to get access to the performed request from nock
        // nock isn't able to provide it
        const getBody = function(body) {
          requestBody = body;
          return body;
        };

        return call = nock(env['APIARY_API_URL']).
          filteringRequestBody(getBody).
          post(uri).
          reply(201, JSON.stringify({"_id": runId, "reportUrl": reportUrl}));
      });

      it('should set uuid', function(done) {
        emitter = new EventEmitter;
        const apiaryReporter = new ApiaryReporter(emitter, {}, {}, {custom:{apiaryReporterEnv:env}});
        return emitter.emit('start', blueprintData, function() {
          assert.isNotNull(apiaryReporter.uuid);
          return done();
        });
      });

      it('should set start time', function(done) {
        emitter = new EventEmitter;
        const apiaryReporter = new ApiaryReporter(emitter, {}, {}, {custom:{apiaryReporterEnv:env}});
        return emitter.emit('start', blueprintData, function() {
          assert.isNotNull(apiaryReporter.startedAt);
          return done();
        });
      });

      it('should call "create new test run" HTTP resource', function(done ) {
        emitter = new EventEmitter;
        const apiaryReporter = new ApiaryReporter(emitter, {}, {}, {custom:{apiaryReporterEnv:env}});
        return emitter.emit('start', blueprintData, function() {
          assert.isTrue(call.isDone());
          return done();
        });
      });

      it('should attach test run ID back to the reporter as remoteId', function(done) {
        emitter = new EventEmitter;
        const apiaryReporter = new ApiaryReporter(emitter, {}, {}, {custom:{apiaryReporterEnv:env}});
        return emitter.emit('start', blueprintData, function() {
          assert.isNotNull(apiaryReporter.remoteId);
          return done();
        });
      });

      it('should attach test run reportUrl to the reporter as reportUrl', function(done) {
        emitter = new EventEmitter;
        const apiaryReporter = new ApiaryReporter(emitter, {}, {}, {custom:{apiaryReporterEnv:env}});
        return emitter.emit('start', blueprintData, function() {
          assert.isNotNull(apiaryReporter.reportUrl);
          return done();
        });
      });

      it('should have blueprints key in the request and it should be an array and members should have proper structure', function(done) {
        emitter = new EventEmitter;
        const apiaryReporter = new ApiaryReporter(emitter, {}, {}, {custom:{apiaryReporterEnv:env}});
        return emitter.emit('start', blueprintData, function() {
          const parsedBody = JSON.parse(requestBody);
          assert.isArray(parsedBody.blueprints);
          assert.lengthOf(parsedBody.blueprints, 1);
          for (let blueprint of parsedBody.blueprints) {
            assert.property(blueprint, 'raw');
            assert.propertyVal(blueprint, 'raw', 'FORMAT: 1A\n\n# Machines API\n\n# Group Machines\n\n# Machines collection [/machines/{id}]\n  + Parameters\n    - id (number, `1`)\n\n## Get Machines [GET]\n\n- Request (application/json)\n  + Parameters\n    - id (number, `2`)\n\n- Response 200 (application/json; charset=utf-8)\n\n    [\n      {\n        "type": "bulldozer",\n        "name": "willy"\n      }\n    ]\n\n- Request (application/json)\n  + Parameters\n    - id (number, `3`)\n\n- Response 200 (application/json; charset=utf-8)\n\n    [\n      {\n        "type": "bulldozer",\n        "name": "willy"\n      }\n    ]\n');
            assert.property(blueprint, 'filename');
            assert.propertyVal(blueprint, 'filename', './test/fixtures/multiple-examples.apib');
            assert.property(blueprint, 'annotations');
            assert.isArray(blueprint.annotations);
          }
          return done();
        });
      });

      it('should have various needed keys in test-run payload sent to apiary', function(done) {
        emitter = new EventEmitter;
        const apiaryReporter = new ApiaryReporter(emitter, {}, {}, {server: 'http://my.server.co:8080', custom:{apiaryReporterEnv:env}});
        return emitter.emit('start', blueprintData, function() {
          const parsedBody = JSON.parse(requestBody);
          assert.propertyVal(parsedBody, 'endpoint', 'http://my.server.co:8080');
          return done();
        });
      });

      it('should send the test-run as public one', function(done) {
        emitter = new EventEmitter;
        const apiaryReporter = new ApiaryReporter(emitter, {}, {}, {server: 'http://my.server.co:8080', custom:{apiaryReporterEnv:env}});
        return emitter.emit('start', blueprintData, function() {
          const parsedBody = JSON.parse(requestBody);
          assert.strictEqual(parsedBody.public, true);
          return done();
        });
      });

      return describe('serverError is true', () =>
        it('should not do anything', function(done) {
          emitter = new EventEmitter;
          const apiaryReporter = new ApiaryReporter(emitter, {}, {}, {custom:{apiaryReporterEnv:env}});
          apiaryReporter.serverError = true;
          return emitter.emit('start', blueprintData, function() {
            assert.isFalse(call.isDone());
            return done();
          });
        })
      );
    });

    describe('when adding passing test', function() {
      let call = null;
      const runId = '507f1f77bcf86cd799439011';
      test = null;
      let requestBody = null;

      beforeEach(function() {
        const uri = `/apis/public/tests/steps?testRunId=${runId}`;

        // this is a hack how to get access to the performed request from nock
        // nock isn't able to provide it
        const getBody = function(body) {
          requestBody = body;
          return body;
        };

        return call = nock(env['APIARY_API_URL']).
          filteringRequestBody(getBody).
          post(uri).
          reply(201, {"_id": runId});
      });

      it('should call "create new test step" HTTP resource', function(done) {
        emitter = new EventEmitter;
        const apiaryReporter = new ApiaryReporter(emitter, {}, {}, {custom:{apiaryReporterEnv:env}});
        apiaryReporter.remoteId = runId;
        return emitter.emit('test pass', test, function() {
          assert.isTrue(call.isDone());
          return done();
        });
      });

      it('should have origin with filename in the request', function(done) {
        emitter = new EventEmitter;
        const apiaryReporter = new ApiaryReporter(emitter, {}, {}, {custom:{apiaryReporterEnv:env}});
        apiaryReporter.remoteId = runId;
        return emitter.emit('test pass', test, function() {
          const parsedBody = JSON.parse(requestBody);
          assert.property(parsedBody['origin'], 'filename');
          return done();
        });
      });

      it('should have startedAt timestamp in the request', function(done) {
        emitter = new EventEmitter;
        const apiaryReporter = new ApiaryReporter(emitter, {}, {}, {custom:{apiaryReporterEnv:env}});
        apiaryReporter.remoteId = runId;
        return emitter.emit('test pass', test, function() {
          const parsedBody = JSON.parse(requestBody);
          assert.propertyVal(parsedBody, 'startedAt', (1234567890 * 1000));
          return done();
        });
      });

      return describe('serverError is true', () =>
        it('should not do anything', function(done) {
          emitter = new EventEmitter;
          const apiaryReporter = new ApiaryReporter(emitter, {}, {}, {custom:{apiaryReporterEnv:env}});
          apiaryReporter.remoteId = runId;
          apiaryReporter.serverError = true;
          return emitter.emit('test pass', test, function() {
            assert.isFalse(call.isDone());
            return done();
          });
        })
      );
    });

    describe('when adding failing test', function() {
      let call = null;
      const runId = '507f1f77bcf86cd799439011';
      test = null;

      beforeEach(function() {
        const uri = `/apis/public/tests/steps?testRunId=${runId}`;
        return call = nock(env['APIARY_API_URL']).
          post(uri).
          reply(201, {"_id": runId});
      });

      it('should call "create new test step" HTTP resource', function(done) {
        emitter = new EventEmitter;
        const apiaryReporter = new ApiaryReporter(emitter, {}, {}, {custom:{apiaryReporterEnv:env}});
        apiaryReporter.remoteId = runId;
        return emitter.emit('test fail', test, function() {
          assert.isTrue(call.isDone());
          return done();
        });
      });

      return describe('when serverError is true', () =>
        it('should not do anything', function(done) {
          emitter = new EventEmitter;
          const apiaryReporter = new ApiaryReporter(emitter, {}, {}, {custom:{apiaryReporterEnv:env}});
          apiaryReporter.remoteId = runId;
          apiaryReporter.serverError = true;
          return emitter.emit('test fail', test, function() {
            assert.isFalse(call.isDone());
            return done();
          });
        })
      );
    });

    describe('when adding skipped test', function() {
      let call = null;
      const runId = '507f1f77bcf86cd799439011';
      let clonedTest = null;
      let requestBody = null;

      beforeEach(function() {
        clonedTest = clone(test);
        clonedTest.status = 'skip';

        const uri = `/apis/public/tests/steps?testRunId=${runId}`;

        // this is a hack how to get access to the performed request from nock
        // nock isn't able to provide it
        const getBody = function(body) {
          requestBody = body;
          return body;
        };

        return call = nock(env['APIARY_API_URL']).
          filteringRequestBody(getBody).
          post(uri).
          reply(201, {"_id": runId});
      });

      it('should call "create new test step" HTTP resource', function(done) {
        emitter = new EventEmitter;
        const apiaryReporter = new ApiaryReporter(emitter, {}, {}, {custom:{apiaryReporterEnv:env}});
        apiaryReporter.remoteId = runId;
        return emitter.emit('test skip', clonedTest, function() {
          assert.isTrue(call.isDone());
          return done();
        });
      });

      it('should send status skipped', function(done) {
        emitter = new EventEmitter;
        const apiaryReporter = new ApiaryReporter(emitter, {}, {}, {custom:{apiaryReporterEnv:env}});
        apiaryReporter.remoteId = runId;
        return emitter.emit('test skip', clonedTest, function() {
          assert.equal(JSON.parse(requestBody)['result'], 'skip');
          return done();
        });
      });

      return describe('when serverError is true', () =>
        it('should not do anything', function(done) {
          emitter = new EventEmitter;
          const apiaryReporter = new ApiaryReporter(emitter, {}, {}, {custom:{apiaryReporterEnv:env}});
          apiaryReporter.remoteId = runId;
          apiaryReporter.serverError = true;
          return emitter.emit('test skip', clonedTest, function() {
            assert.isFalse(call.isDone());
            return done();
          });
        })
      );
    });


    describe('when adding test with error', function() {
      let call = null;
      const runId = '507f1f77bcf86cd799439011';
      test = null;
      let requestBody = null;

      beforeEach(function() {
        const uri = `/apis/public/tests/steps?testRunId=${runId}`;

        test['status'] = 'error';

        // this is a hack how to get access to the performed request from nock
        // nock isn't able to provide it
        const getBody = function(body) {
          requestBody = body;
          return body;
        };

        return call = nock(env['APIARY_API_URL']).
          filteringRequestBody(getBody).
          post(uri).
          reply(201, {"_id": runId});
      });

      const connectionErrors = ['ECONNRESET', 'ENOTFOUND', 'ESOCKETTIMEDOUT', 'ETIMEDOUT', 'ECONNREFUSED', 'EHOSTUNREACH', 'EPIPE'];

      for (let errType of connectionErrors) { (errType =>
        describe(`when error type is ${errType}`, function() {
          it('should call "create new test step" HTTP resource', function(done) {
            emitter = new EventEmitter;
            const apiaryReporter = new ApiaryReporter(emitter, {}, {}, {custom:{apiaryReporterEnv:env}});
            apiaryReporter.remoteId = runId;
            const error = new Error('some error');
            error.code = errType;
            return emitter.emit('test error', error, test, function() {
              assert.isTrue(call.isDone());
              return done();
            });
          });

          it('should set result to error', function(done) {
            emitter = new EventEmitter;
            const apiaryReporter = new ApiaryReporter(emitter, {}, {}, {custom:{apiaryReporterEnv:env}});
            apiaryReporter.remoteId = runId;
            const error = new Error('some error');
            error.code = errType;
            return emitter.emit('test error', error, test, function() {
              assert.equal(JSON.parse(requestBody)['result'], 'error');
              return done();
            });
          });


          return it('should set error message', function(done) {
            emitter = new EventEmitter;
            const apiaryReporter = new ApiaryReporter(emitter, {}, {}, {custom:{apiaryReporterEnv:env}});
            apiaryReporter.remoteId = runId;
            const error = new Error('some error');
            error.code = errType;
            return emitter.emit('test error', error, test, function() {
              assert.isArray(JSON.parse(requestBody)['resultData']['result']['general']);
              assert.include(JSON.parse(requestBody)['resultData']['result']['general'].map((value,index) => JSON.stringify(value)).join(),
                "Error connecting to server under test!");
              return done();
            });
          });
        })
      )(errType); }

      describe('when any other error', function() {
        it('should call "create new test step" HTTP resource', function(done) {
          emitter = new EventEmitter;
          const apiaryReporter = new ApiaryReporter(emitter, {}, {}, {custom:{apiaryReporterEnv:env}});
          apiaryReporter.remoteId = runId;
          const error = new Error('some error');
          return emitter.emit('test error', error, test, function() {
            assert.isTrue(call.isDone());
            return done();
          });
        });

        it('should set result to error', function(done) {
          emitter = new EventEmitter;
          const apiaryReporter = new ApiaryReporter(emitter, {}, {}, {custom:{apiaryReporterEnv:env}});
          apiaryReporter.remoteId = runId;
          const error = new Error('some error');
          return emitter.emit('test error', error, test, function() {
            assert.equal(JSON.parse(requestBody)['result'], 'error');
            return done();
          });
        });

        return it('should set descriptive error', function(done) {
          emitter = new EventEmitter;
          const apiaryReporter = new ApiaryReporter(emitter, {}, {}, {custom:{apiaryReporterEnv:env}});
          apiaryReporter.remoteId = runId;
          const error = new Error('some error');
          return emitter.emit('test error', error, test, function() {
            assert.isArray(JSON.parse(requestBody)['resultData']['result']['general']);
            assert.include(JSON.parse(requestBody)['resultData']['result']['general'].map((value,index) => JSON.stringify(value)).join(),
             "Unhandled error occured when executing the transaction.");
            return done();
          });
        });
      });


      return describe('when serverError is true', () =>
        it('should not do anything', function(done) {
          emitter = new EventEmitter;
          const apiaryReporter = new ApiaryReporter(emitter, {}, {}, {custom:{apiaryReporterEnv:env}});
          apiaryReporter.remoteId = runId;
          apiaryReporter.serverError = true;
          const error = new Error('some error');
          return emitter.emit('test error', error, test, function() {
            assert.isFalse(call.isDone());
            return done();
          });
        })
      );
    });

    return describe('when ending', function() {
      let call = null;
      const runId = '507f1f77bcf86cd799439011';
      let requestBody = null;

      beforeEach(function() {
        const uri = `/apis/public/tests/run/${runId}`;
        // this is a hack how to get access to the performed request from nock
        // nock isn't able to provide it
        const getBody = function(body) {
          requestBody = body;
          return body;
        };

        return call = nock(env['APIARY_API_URL']).
          filteringRequestBody(getBody).
          patch(uri).
          reply(201, {"_id": runId});
      });

      it('should update "test run" resource with result data', function(done) {
        emitter = new EventEmitter;
        const apiaryReporter = new ApiaryReporter(emitter, {}, {}, {custom:{apiaryReporterEnv:env}});
        apiaryReporter.remoteId = runId;
        return emitter.emit('end', function() {
          assert.isTrue(call.isDone());
          return done();
        });
      });

      it('should return generated url if no reportUrl is available', function(done) {
        emitter = new EventEmitter;
        const apiaryReporter = new ApiaryReporter(emitter, {}, {}, {custom:{apiaryReporterEnv:env}});
        apiaryReporter.remoteId = runId;
        return emitter.emit('end', function() {
          assert.isOk(loggerStub.complete.calledWith('See results in Apiary at: https://app.apiary.io/public/tests/run/507f1f77bcf86cd799439011'));
          return done();
        });
      });

      it('should return reportUrl from testRun entity', function(done) {
        emitter = new EventEmitter;
        const apiaryReporter = new ApiaryReporter(emitter, {}, {}, {custom:{apiaryReporterEnv:env}});
        apiaryReporter.remoteId = runId;
        apiaryReporter.reportUrl = "https://absolutely.fancy.url/wich-can-change/some/id";
        return emitter.emit('end', function() {
          assert.isOk(loggerStub.complete.calledWith('See results in Apiary at: https://absolutely.fancy.url/wich-can-change/some/id'));
          return done();
        });
      });

      it('should send runner.logs to Apiary at the end of testRun', function(done) {
        emitter = new EventEmitter;
        const logMessages = ['a', 'b'];
        const apiaryReporter = new ApiaryReporter(emitter, {}, {}, {custom:{apiaryReporterEnv:env}}, {logs: clone(logMessages)});
        apiaryReporter.remoteId = runId;
        return emitter.emit('end', function() {
          assert.isString(requestBody);
          const parsedBody = JSON.parse(requestBody);
          assert.isObject(parsedBody);
          assert.property(parsedBody, 'logs');
          assert.deepEqual(parsedBody.logs, logMessages);
          return done();
        });
      });

      return describe('serverError is true', () =>
        it('should not do enything', function(done) {
          emitter = new EventEmitter;
          const apiaryReporter = new ApiaryReporter(emitter, {}, {}, {custom:{apiaryReporterEnv:env}});
          apiaryReporter.remoteId = runId;
          apiaryReporter.serverError = true;
          return emitter.emit('end', function() {
            assert.isFalse(call.isDone());
            return done();
          });
        })
      );
    });
  });

  return describe('with Apiary API token and suite id', function() {
    let stats = {};
    let tests = [];
    let test = {};
    let emitter = {};
    env = {};

    beforeEach(function(done) {
      stats = {
        tests: 0,
        failures: 0,
        errors: 0,
        passes: 0,
        skipped: 0,
        start: 0,
        end: 0,
        duration: 0
      };
      tests = [];
      emitter = new EventEmitter;

      env = {};
      env['APIARY_API_URL'] = `https://127.0.0.1:${PORT}`;
      env['APIARY_API_KEY'] = "aff888af9993db9ef70edf3c878ab521";
      env['APIARY_API_NAME'] = "jakubtest";
      test = {
        status: "fail",
        title: "POST /machines",
        message: "headers: Value of the ‘content-type’ must be application/json.\nbody: No validator found for real data media type 'text/plain' and expected data media type 'application/json'.\nstatusCode: Real and expected data does not match.\n",

        startedAt: (1234567890 * 1000), // JavaScript Date.now() timestamp (UNIX-like timestamp * 1000 precision)

        actual: {
          statusCode: 400,
          headers: {
            "content-type": "text/plain"
          },

          body: "Foo bar"
        },

        expected: {
          headers: {
            "content-type": "application/json"
          },

          body: "{\n  \"type\": \"bulldozer\",\n  \"name\": \"willy\",\n  \"id\": \"5229c6e8e4b0bd7dbb07e29c\"\n}\n",
          status: "202"
        },

        request: {
          body: "{\n  \"type\": \"bulldozer\",\n  \"name\": \"willy\"}\n",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "Dredd/0.2.1 (Darwin 13.0.0; x64)",
            "Content-Length": 44
          },

          uri: "/machines",
          method: "POST"
        },

        results: {
          headers: {
            results: [{
              pointer: "/content-type",
              severity: "error",
              message: "Value of the ‘content-type’ must be application/json."
            }
            ],
            realType: "application/vnd.apiary.http-headers+json",
            expectedType: "application/vnd.apiary.http-headers+json",
            validator: "HeadersJsonExample",
            rawData: {
              0: {
                property: ["content-type"],
                propertyValue: "text/plain",
                attributeName: "enum",
                attributeValue: ["application/json"],
                message: "Value of the ‘content-type’ must be application/json.",
                validator: "enum",
                validatorName: "enum",
                validatorValue: ["application/json"]
              },

              length: 1
            }
          },

          body: {
            results: [{
              message: "No validator found for real data media type 'text/plain' and expected data media type 'application/json'.",
              severity: "error"
            }
            ],
            realType: "text/plain",
            expectedType: "application/json",
            validator: null,
            rawData: null
          },

          statusCode: {
            realType: "text/vnd.apiary.status-code",
            expectedType: "text/vnd.apiary.status-code",
            validator: "TextDiff",
            rawData: "@@ -1,3 +1,9 @@\n-400\n+undefined\n",
            results: [{
              severity: "error",
              message: "Real and expected data does not match."
            }
            ]
          }
        }
      };

      nock.disableNetConnect();
      return done();
    });

    afterEach(function(done) {
      nock.enableNetConnect();
      nock.cleanAll();
      return done();
    });

    describe('when starting', function() {
      let call = null;
      const runId = '507f1f77bcf86cd799439011';
      const reportUrl = "https://absolutely.fancy.url/wich-can-change/some/id";
      let requestBody = null;

      beforeEach(function() {
        const uri = `/apis/${env['APIARY_API_NAME']}/tests/runs`;

        requestBody = null;
        const getBody = function(body) {
          requestBody = body;
          return body;
        };

        return call = nock(env['APIARY_API_URL']).
          filteringRequestBody(getBody).
          post(uri).
          matchHeader('Authentication', `Token ${env['APIARY_API_KEY']}`).
          reply(201, {"_id": runId, "reportUrl": reportUrl});
      });

      it('should set uuid', function(done) {
        emitter = new EventEmitter;
        const apiaryReporter = new ApiaryReporter(emitter, {}, {}, {custom:{apiaryReporterEnv:env}});
        return emitter.emit('start', blueprintData, function() {
          assert.isNotNull(apiaryReporter.uuid);
          return done();
        });
      });

      it('should set start time', function(done) {
        emitter = new EventEmitter;
        const apiaryReporter = new ApiaryReporter(emitter, {}, {}, {custom:{apiaryReporterEnv:env}});
        return emitter.emit('start', blueprintData, function() {
          assert.isNotNull(apiaryReporter.startedAt);
          return done();
        });
      });

      it('should call "create new test run" HTTP resource', function(done ) {
        emitter = new EventEmitter;
        const apiaryReporter = new ApiaryReporter(emitter, {}, {}, {custom:{apiaryReporterEnv:env}});
        return emitter.emit('start', blueprintData, function() {
          assert.isTrue(call.isDone());
          return done();
        });
      });

      it('should attach test run ID back to the reporter as remoteId', function(done) {
        emitter = new EventEmitter;
        const apiaryReporter = new ApiaryReporter(emitter, {}, {}, {custom:{apiaryReporterEnv:env}});
        return emitter.emit('start', blueprintData, function() {
          assert.isNotNull(apiaryReporter.remoteId);
          return done();
        });
      });

      it('should attach test run reportUrl to the reporter as reportUrl', function(done) {
        emitter = new EventEmitter;
        const apiaryReporter = new ApiaryReporter(emitter, {}, {}, {custom:{apiaryReporterEnv:env}});
        return emitter.emit('start', blueprintData, function() {
          assert.isNotNull(apiaryReporter.reportUrl);
          return done();
        });
      });

      return it('should send the test-run as non-public', function(done) {
        emitter = new EventEmitter;
        const apiaryReporter = new ApiaryReporter(emitter, {}, {}, {server: 'http://my.server.co:8080', custom:{apiaryReporterEnv:env}});
        return emitter.emit('start', blueprintData, function() {
          const parsedBody = JSON.parse(requestBody);
          assert.strictEqual(parsedBody.public, false);
          return done();
        });
      });
    });

    describe('when adding passing test', function() {
      let call = null;
      const runId = '507f1f77bcf86cd799439011';
      test = null;

      beforeEach(function() {
        const uri = `/apis/${env['APIARY_API_NAME']}/tests/steps?testRunId=${runId}`;
        return call = nock(env['APIARY_API_URL']).
          post(uri).
          matchHeader('Authentication', `Token ${env['APIARY_API_KEY']}`).
          reply(201, {"_id": runId});
      });

      return it('should call "create new test step" HTTP resource', function(done) {
        emitter = new EventEmitter;
        const apiaryReporter = new ApiaryReporter(emitter, {}, {}, {custom:{apiaryReporterEnv:env}});
        apiaryReporter.remoteId = runId;
        return emitter.emit('test pass', test, function() {
          assert.isTrue(call.isDone());
          return done();
        });
      });
    });

    describe('when adding failing test', function() {
      let call = null;
      const runId = '507f1f77bcf86cd799439011';
      test = null;

      beforeEach(function() {
        const uri = `/apis/${env['APIARY_API_NAME']}/tests/steps?testRunId=${runId}`;
        return call = nock(env['APIARY_API_URL']).
          post(uri).
          matchHeader('Authentication', `Token ${env['APIARY_API_KEY']}`).
          reply(201, {"_id": runId});
      });

      return it('should call "create new test step" HTTP resource', function(done) {
        emitter = new EventEmitter;
        const apiaryReporter = new ApiaryReporter(emitter, {}, {}, {custom:{apiaryReporterEnv:env}});
        apiaryReporter.remoteId = runId;
        return emitter.emit('test fail', test, function() {
          assert.isTrue(call.isDone());
          return done();
        });
      });
    });


    return describe('when ending', function() {
      let call = null;
      const runId = '507f1f77bcf86cd799439011';

      beforeEach(function() {
        const uri = `/apis/${env['APIARY_API_NAME']}/tests/run/${runId}`;
        return call = nock(env['APIARY_API_URL']).
          patch(uri).
          matchHeader('Authentication', `Token ${env['APIARY_API_KEY']}`).
          reply(201, {"_id": runId});
      });

      it('should update "test run" resource with result data', function(done) {
        emitter = new EventEmitter;
        const apiaryReporter = new ApiaryReporter(emitter, {}, {}, {custom:{apiaryReporterEnv:env}});
        apiaryReporter.remoteId = runId;
        return emitter.emit('end', function() {
          assert.isTrue(call.isDone());
          return done();
        });
      });

      it('should return generated url if reportUrl is not available', function(done) {
        emitter = new EventEmitter;
        const apiaryReporter = new ApiaryReporter(emitter, {}, {}, {custom:{apiaryReporterEnv:env}});
        apiaryReporter.remoteId = runId;
        return emitter.emit('end', function() {
          assert.isOk(loggerStub.complete.calledWith('See results in Apiary at: https://app.apiary.io/jakubtest/tests/run/507f1f77bcf86cd799439011'));
          return done();
        });
      });

      return it('should return reportUrl from testRun entity', function(done) {
        emitter = new EventEmitter;
        const apiaryReporter = new ApiaryReporter(emitter, {}, {}, {custom:{apiaryReporterEnv:env}});
        apiaryReporter.remoteId = runId;
        apiaryReporter.reportUrl = "https://absolutely.fancy.url/wich-can-change/some/id";
        return emitter.emit('end', function() {
          assert.isOk(loggerStub.complete.calledWith('See results in Apiary at: https://absolutely.fancy.url/wich-can-change/some/id'));
          return done();
        });
      });
    });
  });
});
