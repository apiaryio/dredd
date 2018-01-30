// coffeelint: disable=max_line_length

const {EventEmitter} = require('events');
const {assert} = require('chai');
const clone = require('clone');
const caseless = require('caseless');
const nock = require('nock');
nock.enableNetConnect();

const proxyquire = require('proxyquire');
const sinon = require('sinon');
const express = require('express');
const bodyParser = require('body-parser');

const htmlStub = require('html');
const loggerStub = require('../../src/logger');
const addHooks = require('../../src/add-hooks');

const Runner = proxyquire('../../src/transaction-runner', {
  'html': htmlStub,
  './logger': loggerStub
});
const CliReporter = require('../../src/reporters/cli-reporter');
const Hooks = require('../../src/hooks');

describe('TransactionRunner', function() {

  let server = {};
  let configuration = {
    server: 'http://127.0.0.1:3000',
    emitter: new EventEmitter(),
    options: {
      'dry-run': false,
      method: [],
      only: [],
      header: [],
      reporter:  []
    }
  };
  let transaction = {};
  let runner = {};

  before(function() {
    loggerStub.transports.console.silent = true;
    return nock.disableNetConnect();
  });

  after(function() {
    loggerStub.transports.console.silent = false;
    return nock.enableNetConnect();
  });

  describe('constructor', function() {

    beforeEach(() => runner = new Runner(configuration));

    it('should copy configuration', () => assert.isOk(runner.configuration.server));

    it('should have an empty hookStash object', () => assert.deepEqual(runner.hookStash, {}));

    return it('should have an empty array of logs object', () => assert.deepEqual(runner.logs, []));
});

  describe('config(config)', function() {
    describe('when single file in data is present', () =>
      it('should set multiBlueprint to false', function() {
        configuration = {
          server: 'http://127.0.0.1:3000',
          emitter: new EventEmitter(),
          data: {"file1": {"raw": "blueprint1"}},
          options: {
            'dry-run': false,
            method: [],
            only: [],
            header: [],
            reporter: []
          }
        };

        runner = new Runner(configuration);
        runner.config(configuration);

        return assert.notOk(runner.multiBlueprint);
      })
    );

    return describe('when multiple files in data are present', () =>
      it('should set multiBlueprint to true', function() {
        configuration = {
          server: 'http://127.0.0.1:3000',
          emitter: new EventEmitter(),
          data: {"file1": {"raw": "blueprint1"}, "file2": {"raw": "blueprint2"} },
          options: {
            'dry-run': false,
            method: [],
            only: [],
            header: [],
            reporter: []
          }
        };
        runner = new Runner(configuration);
        runner.config(configuration);

        return assert.isOk(runner.multiBlueprint);
      })
    );
  });

  describe('configureTransaction(transaction)', function() {
    beforeEach(function() {
      transaction = {
        name: "Machines API > Group Machine > Machine > Delete Message > Bogus example name",
        request: {
          body: "{\n  \"type\": \"bulldozer\",\n  \"name\": \"willy\"}\n",
          headers: {
            "Content-Type": {
              value: "application/json"
            }
          },
          uri: "/machines",
          method: "POST"
        },
        response: {
          body: "{\n  \"type\": \"bulldozer\",\n  \"name\": \"willy\",\n  \"id\": \"5229c6e8e4b0bd7dbb07e29c\"\n}\n",
          headers: {
            "content-type": {
              value: "application/json"
            }
          },
          status: "202"
        },
        origin: {
          apiName: "Machines API",
          resourceGroupName: "Group Machine",
          resourceName: "Machine",
          actionName: "Delete Message",
          exampleName: "Bogus example name"
        }
      };

      return runner = new Runner(configuration);
    });

    describe('when server address', function() {
      const filename = 'api-description.apib';
      let configuredTransaction = undefined;

      return [{
        description: 'is hostname',
        input: {serverUrl: 'https://127.0.0.1:8000', requestPath: '/hello'},
        expected: {host: '127.0.0.1', port: '8000', protocol: 'https:', fullPath: '/hello'}
      }
      , {
        description: 'is IPv4',
        input: {serverUrl: 'https://127.0.0.1:8000', requestPath: '/hello'},
        expected: {host: '127.0.0.1', port: '8000', protocol: 'https:', fullPath: '/hello'}
      }
      , {
        description: 'has path',
        input: {serverUrl: 'http://127.0.0.1:8000/v1', requestPath: '/hello'},
        expected: {host: '127.0.0.1', port: '8000', protocol: 'http:', fullPath: '/v1/hello'}
      }
      , {
        description: 'has path with trailing slash',
        input: {serverUrl: 'http://127.0.0.1:8000/v1/', requestPath: '/hello'},
        expected: {host: '127.0.0.1', port: '8000', protocol: 'http:', fullPath: '/v1/hello'}
      }
      , {
        description: 'has path and request path is /',
        input: {serverUrl: 'http://127.0.0.1:8000/v1', requestPath: '/'},
        expected: {host: '127.0.0.1', port: '8000', protocol: 'http:', fullPath: '/v1/'}
      }
      , {
        description: 'has path with trailing slash and request path is /',
        input: {serverUrl: 'http://127.0.0.1:8000/v1/', requestPath: '/'},
        expected: {host: '127.0.0.1', port: '8000', protocol: 'http:', fullPath: '/v1/'}
      }
      , {
        description: 'has path and request has no path',
        input: {serverUrl: 'http://127.0.0.1:8000/v1', requestPath: ''},
        expected: {host: '127.0.0.1', port: '8000', protocol: 'http:', fullPath: '/v1'}
      }
      , {
        description: 'has path with trailing slash and request has no path',
        input: {serverUrl: 'http://127.0.0.1:8000/v1/', requestPath: ''},
        expected: {host: '127.0.0.1', port: '8000', protocol: 'http:', fullPath: '/v1/'}
      }
      , {
        description: 'is hostname with no protocol',
        input: {serverUrl: '127.0.0.1', requestPath: '/hello'},
        expected: {host: '127.0.0.1', port: null, protocol: 'http:', fullPath: '/hello'}
      }
      , {
        description: 'is IPv4 with no protocol',
        input: {serverUrl: '127.0.0.1:4000', requestPath: '/hello'},
        expected: {host: '127.0.0.1', port: '4000', protocol: 'http:', fullPath: '/hello'}
      }
      , {
        description: 'is hostname with // instead of protocol',
        input: {serverUrl: '//127.0.0.1', requestPath: '/hello'},
        expected: {host: '127.0.0.1', port: null, protocol: 'http:', fullPath: '/hello'}
      }
      , {
        description: 'is hostname with trailing slash',
        input: {serverUrl: 'http://127.0.0.1/', requestPath: '/hello'},
        expected: {host: '127.0.0.1', port: null, protocol: 'http:', fullPath: '/hello'}
      }
      , {
        description: 'is hostname with no protocol and with trailing slash',
        input: {serverUrl: '127.0.0.1/', requestPath: '/hello'},
        expected: {host: '127.0.0.1', port: null, protocol: 'http:', fullPath: '/hello'}
      }

      ].forEach(({description, input, expected}) =>
        context(`${description}: '${input.serverUrl}' + '${input.requestPath}'`, function() {
          beforeEach( function() {
            transaction.request.uri = input.requestPath;
            transaction.origin.filename = filename;

            runner.configuration.server = input.serverUrl;
            if (runner.configuration.data == null) { runner.configuration.data = {}; }
            if (runner.configuration.data[filename] == null) { runner.configuration.data[filename] = {}; }
            runner.configuration.data[filename].mediaType = 'text/vnd.apiblueprint';

            return configuredTransaction = runner.configureTransaction(transaction);
          });

          return it(`the transaction gets configured with fullPath '${expected.fullPath}' and has expected host, port, and protocol`, () =>
            assert.deepEqual({
              host: configuredTransaction.host,
              port: configuredTransaction.port,
              protocol: configuredTransaction.protocol,
              fullPath: configuredTransaction.fullPath
            }
            , expected)
          );
        })
      );
    });

    describe('when processing Swagger document and given transaction has non-2xx status code', function() {
      const filename = 'api-description.yml';
      let configuredTransaction = undefined;

      return ['100', '400', 199, 300].forEach(status =>
        context(`status code: ${JSON.stringify(status)}`, function() {
          beforeEach( function() {
            transaction.response.status = status;
            transaction.origin.filename = filename;

            if (runner.configuration.data == null) { runner.configuration.data = {}; }
            if (runner.configuration.data[filename] == null) { runner.configuration.data[filename] = {}; }
            runner.configuration.data[filename].mediaType = 'application/swagger+json';

            return configuredTransaction = runner.configureTransaction(transaction);
          });

          return it('skips the transaction by default', () => assert.isTrue(configuredTransaction.skip));
        })
      );
    });

    describe('when processing Swagger document and given transaction has 2xx status code', function() {
      const filename = 'api-description.yml';
      let configuredTransaction = undefined;

      return ['200', 299].forEach(status =>
        context(`status code: ${JSON.stringify(status)}`, function() {
          beforeEach( function() {
            transaction.response.status = status;
            transaction.origin.filename = filename;

            if (runner.configuration.data == null) { runner.configuration.data = {}; }
            if (runner.configuration.data[filename] == null) { runner.configuration.data[filename] = {}; }
            runner.configuration.data[filename].mediaType = 'application/swagger+json';

            return configuredTransaction = runner.configureTransaction(transaction);
          });

          return it('does not skip the transaction by default', () => assert.isFalse(configuredTransaction.skip));
        })
      );
    });

    describe('when processing other than Swagger document and given transaction has non-2xx status code', function() {
      const filename = 'api-description.yml';
      let configuredTransaction = undefined;

      beforeEach( function() {
        transaction.response.status = 400;
        transaction.origin.filename = filename;

        if (runner.configuration.data == null) { runner.configuration.data = {}; }
        if (runner.configuration.data[filename] == null) { runner.configuration.data[filename] = {}; }
        runner.configuration.data[filename].mediaType = 'text/plain';

        return configuredTransaction = runner.configureTransaction(transaction);
      });

      return it('does not skip the transaction by default', () => assert.isFalse(configuredTransaction.skip));
    });

    describe('when processing multiple API description documents', () =>
      it('should include api name in the transaction name', function() {
        runner.multiBlueprint = true;
        const configuredTransaction = runner.configureTransaction(transaction);
        return assert.include(configuredTransaction.name, 'Machines API');
      })
    );

    describe('when processing only single API description document', () =>
      it('should not include api name in the transaction name', function() {
        runner.multiBlueprint = false;
        const configuredTransaction = runner.configureTransaction(transaction);
        return assert.notInclude(configuredTransaction.name, 'Machines API');
      })
    );

    describe('when request does not have User-Agent', () =>

      it('should add the Dredd User-Agent', function() {
        const configuredTransaction = runner.configureTransaction(transaction);
        return assert.isOk(configuredTransaction.request.headers['User-Agent']);
    })
  );

    describe('when an additional header has a colon', function() {
      beforeEach(function() {
        const conf = clone(configuration);
        conf.options.header = ["MyCustomDate:Wed, 10 Sep 2014 12:34:26 GMT"];
        return runner = new Runner(conf);
      });

      return it('should include the entire value in the header', function() {
        const configuredTransaction = runner.configureTransaction(transaction);
        return assert.equal(configuredTransaction.request.headers['MyCustomDate'], 'Wed, 10 Sep 2014 12:34:26 GMT');
      });
    });

    describe('when configuring a transaction', () =>

      it('should callback with a properly configured transaction', function() {
        const configuredTransaction = runner.configureTransaction(transaction);
        assert.equal(configuredTransaction.name, 'Group Machine > Machine > Delete Message > Bogus example name');
        assert.equal(configuredTransaction.id, 'POST (202) /machines');
        assert.isOk(configuredTransaction.host);
        assert.isOk(configuredTransaction.request);
        assert.isOk(configuredTransaction.expected);
        return assert.strictEqual(transaction.origin, configuredTransaction.origin);
      })
    );

    return describe('when endpoint URL contains PORT and path', function() {
      beforeEach(function() {
        const configurationWithPath = clone(configuration);
        configurationWithPath.server = 'https://hostname.tld:9876/my/path/to/api/';
        return runner = new Runner(configurationWithPath);
      });

      it('should join the endpoint path with transaction uriTemplate together', function() {
        const configuredTransaction = runner.configureTransaction(transaction);
        assert.equal(configuredTransaction.id, 'POST (202) /machines');
        assert.strictEqual(configuredTransaction.host, 'hostname.tld');
        assert.equal(configuredTransaction.port, 9876);
        assert.strictEqual(configuredTransaction.protocol, 'https:');
        return assert.strictEqual(configuredTransaction.fullPath, '/my/path/to/api/machines');
      });

      return it('should keep trailing slash in url if present', function() {
        transaction.request.uri = '/machines/';
        const configuredTransaction = runner.configureTransaction(transaction);
        assert.equal(configuredTransaction.id, 'POST (202) /machines/');
        return assert.strictEqual(configuredTransaction.fullPath, '/my/path/to/api/machines/');
      });
    });
  });

  describe('executeTransaction(transaction, callback)', function() {

    beforeEach(() =>
      transaction = {
        name: 'Group Machine > Machine > Delete Message > Bogus example name',
        id: 'POST (202) /machines',
        host: '127.0.0.1',
        port: '3000',
        request: {
          body: '{\n  "type": "bulldozer",\n  "name": "willy"}\n',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Dredd/0.2.1 (Darwin 13.0.0; x64)',
            'Content-Length': 44
          },
          uri: '/machines',
          method: 'POST'
        },
        expected: {
          headers: { 'content-type': 'application/json'
        },
          body: '{\n  "type": "bulldozer",\n  "name": "willy",\n  "id": "5229c6e8e4b0bd7dbb07e29c"\n}\n',
          status: '202'
        },
        origin: {
          resourceGroupName: 'Group Machine',
          resourceName: 'Machine',
          actionName: 'Delete Message',
          exampleName: 'Bogus example name'
        },
        fullPath: '/machines',
        protocol: 'http:'
      }
    );

    describe('when printing the names', function() {

      beforeEach(function() {
        sinon.spy(loggerStub, 'info');
        configuration.options['names'] = true;
        return runner = new Runner(configuration);
      });

      afterEach(function() {
        loggerStub.info.restore();
        return configuration.options['names'] = false;
      });

      return it('should print the names and return', done =>
        runner.executeTransaction(transaction, function() {
          assert.isOk(loggerStub.info.called);
          return done();
        })
      );
    });

    describe('when a dry run', function() {

      beforeEach(function() {
        configuration.options['dry-run'] = true;
        runner = new Runner(configuration);
        return sinon.spy(runner, 'performRequest');
      });


      afterEach(function() {
        configuration.options['dry-run'] = false;
        return runner.performRequest.restore();
      });

      return it('should skip the tests', done =>
        runner.executeTransaction(transaction, function() {
          assert.isOk(runner.performRequest.notCalled);
          return done();
        })
      );
    });

    describe('when only certain methods are allowed by the configuration', function() {

      beforeEach(function() {
        configuration.options['method'] = ['GET'];
        runner = new Runner(configuration);
        return sinon.spy(runner, 'skipTransaction');
      });

      afterEach(function() {
        configuration.options['method'] = [];
        return runner.skipTransaction.restore();
      });

      return it('should only perform those requests', done =>
        runner.executeTransaction(transaction, function() {
          assert.isOk(runner.skipTransaction.called);
          return done();
        })
      );
    });

    describe('when only certain names are allowed by the configuration', function() {

      beforeEach(function() {
        server = nock('http://127.0.0.1:3000').
          post('/machines', {"type":"bulldozer", "name":"willy"}).
          reply(transaction['expected']['status'],
            transaction['expected']['body'],
            {'Content-Type': 'application/json'});

        configuration.options['only'] = ['Group Machine > Machine > Delete Message > Bogus example name'];
        runner = new Runner(configuration);
        return sinon.spy(runner, 'skipTransaction');
      });

      afterEach(function() {
        runner.skipTransaction.restore();
        configuration.options['only'] = [];
        return nock.cleanAll();
      });

      it('should not skip transactions with matching names', done =>
        runner.executeTransaction(transaction, function() {
          assert.notOk(runner.skipTransaction.called);
          return done();
        })
      );

      return it('should skip transactions with different names', function(done) {
        transaction['name'] = 'Group Machine > Machine > Delete Message > Bogus different example name';
        return runner.executeTransaction(transaction, function() {
          assert.isOk(runner.skipTransaction.called);
          return done();
        });
      });
    });

    describe('when a test has been manually set to skip in a hook', function() {
      let clonedTransaction = null;

      beforeEach(function(done) {
        sinon.stub(configuration.emitter, 'emit');

        clonedTransaction = clone(transaction);

        runner = new Runner(configuration);

        return addHooks(runner, [clonedTransaction], function(err) {
          if (err) { return done(err); }

          runner.hooks.beforeHooks = {
            'Group Machine > Machine > Delete Message > Bogus example name' : [
              hookTransaction => hookTransaction.skip = true
            ]
          };
          return done();
        });
      });

      afterEach(() => configuration.emitter.emit.restore());

      // If you happen to wonder why some of the callbacks in following tests
      // get executed twice, see try/catch in runHooksForData() in transaction-runner.coffee

      it('should skip the test', done =>
        runner.executeAllTransactions([clonedTransaction], runner.hooks, function(err) {
          assert.isOk(configuration.emitter.emit.calledWith('test skip'));
          return done(err);
        })
      );

      it('should add skip message as a warning under `general` to the results on transaction', done =>
        runner.executeAllTransactions([clonedTransaction], runner.hooks, function(err) {
          const messages = clonedTransaction['results']['general']['results'].map((value, index) => value['message']);
          assert.include(messages.join().toLowerCase(), 'skipped');
          return done(err);
        })
      );

      it('should add fail message as a warning under `general` to the results on test passed to the emitter', done =>
        runner.executeAllTransactions([clonedTransaction], runner.hooks, function(err) {
          const messages = [];
          const { callCount } = configuration.emitter.emit;
          for (let callNo = 0, end = callCount - 1, asc = 0 <= end; asc ? callNo <= end : callNo >= end; asc ? callNo++ : callNo--) {
            messages.push(configuration.emitter.emit.getCall(callNo).args[1]['results']['general']['results'].map(
              (value, index) => value['message'])
            );
          }
          assert.include(messages.join().toLowerCase(), 'skipped');
          return done(err);
        })
      );

      return it('should set status `skip` on test passed to the emitter', done =>
        runner.executeAllTransactions([clonedTransaction], runner.hooks, function(err) {
          const tests = [];
          const callCount = Object.keys(configuration.emitter.emit.args).map(function(value, index) {
            const args = configuration.emitter.emit.args[value];
            if (args[0] === 'test skip') { return tests.push(args[1]); }
          });

          assert.equal(tests.length, 1);
          assert.equal(tests[0]['status'], 'skip');
          return done(err);
        })
      );
    });


    describe('when server uses https', function() {

      beforeEach(function() {
        server = nock('https://127.0.0.1:3000').
          post('/machines', {"type":"bulldozer", "name":"willy"}).
          reply(transaction['expected']['status'],
            transaction['expected']['body'],
            {'Content-Type': 'application/json'});
        configuration.server = 'https://127.0.0.1:3000';
        transaction.protocol = 'https:';
        return runner = new Runner(configuration);
      });

      afterEach(() => nock.cleanAll());

      return it('should make the request with https', done =>
        runner.executeTransaction(transaction, function() {
          assert.isOk(server.isDone());
          return done();
        })
      );
    });

    describe('when server uses http', function() {

      beforeEach(function() {
        server = nock('http://127.0.0.1:3000').
          post('/machines', {"type":"bulldozer", "name":"willy"}).
          reply(transaction['expected']['status'],
            transaction['expected']['body'],
            {'Content-Type': 'application/json'});
        configuration.server = 'http://127.0.0.1:3000';
        transaction.protocol = 'http:';
        return runner = new Runner(configuration);
      });

      afterEach(() => nock.cleanAll());

      return it('should make the request with http', done =>
        runner.executeTransaction(transaction, function() {
          assert.isOk(server.isDone());
          return done();
        })
      );
    });

    describe('when backend responds as it should', function() {
      beforeEach(function() {
        server = nock('http://127.0.0.1:3000').
          post('/machines', {"type":"bulldozer", "name":"willy"}).
          reply(transaction['expected']['status'],
            transaction['expected']['body'],
            {'Content-Type': 'application/json'});
        return runner = new Runner(configuration);
      });

      afterEach(() => nock.cleanAll());

      it('should perform the request', done =>
        runner.executeTransaction(transaction, function() {
          assert.isOk(server.isDone());
          return done();
        })
      );

      return it('should not return an error', done =>
        runner.executeTransaction(transaction, function(error) {
          assert.notOk(error);
          return done();
        })
      );
    });

    describe('when backend responds with invalid response', function() {
      beforeEach(function() {
        server = nock('http://127.0.0.1:3000').
          post('/machines', {"type":"bulldozer", "name":"willy"}).
          reply(400,
            'Foo bar',
            {'Content-Type': 'text/plain'});
        return runner = new Runner(configuration);
      });

      afterEach(() => nock.cleanAll());

      return it('should perform the request', done =>
        runner.executeTransaction(transaction, function() {
          assert.isOk(server.isDone());
          return done();
        })
      );
    });

    describe('when backend responds a GET request with a redirection', function() {
      beforeEach(function() {
        transaction.request.method = 'GET';
        transaction.request.uri = '/machines/latest';
        transaction.fullPath = '/machines/latest';
        server = nock('http://127.0.0.1:3000').
          get('/machines/latest').
          reply(303, '', {'Location': '/machines/123'}).
          get('/machines/123').
          reply(transaction['expected']['status'],
            transaction['expected']['body'],
            {'Content-Type': 'application/json'});
        return runner = new Runner(configuration);
      });

      afterEach(() => nock.cleanAll());

      return it('should not follow the redirect', done =>
        runner.executeTransaction(transaction, function() {
          assert.equal(transaction.real.statusCode, 303);
          assert.notOk(server.isDone());
          return done();
        })
      );
    });

    describe('when backend responds a POST request with a redirection', function() {
      beforeEach(function() {
        transaction.request.method = 'POST';
        server = nock('http://127.0.0.1:3000').
        post('/machines').
        reply(303, '', {'Location': '/machines/123'}).
        get('/machines/123').
        reply(transaction['expected']['status'],
          transaction['expected']['body'],
          {'Content-Type': 'application/json'});
        return runner = new Runner(configuration);
      });

      afterEach(() => nock.cleanAll());

      return it('should not follow the redirect', done =>
        runner.executeTransaction(transaction, function() {
          assert.equal(transaction.real.statusCode, 303);
          assert.notOk(server.isDone());
          return done();
        })
      );
    });

    return describe('when server is not running', function() {
      beforeEach(function() {
        sinon.spy(configuration.emitter, 'emit');
        return runner = new Runner(configuration);
      });

      afterEach(() => configuration.emitter.emit.restore());

      return it('should report a error', done =>
        runner.executeTransaction(transaction, function() {
          assert.isOk(configuration.emitter.emit.called);
          const events = Object.keys(configuration.emitter.emit.args).map((value, index) => configuration.emitter.emit.args[value][0]);
          assert.include(events, 'test error');
          return done();
        })
      );
    });
  });

  describe('setContentLength(transaction)', function() {
    const bodyFixture = JSON.stringify({
      type: 'bulldozer',
      name: 'willy',
      id: '5229c6e8e4b0bd7dbb07e29c'
    }
    , null, 2);

    const transactionFixture = {
      name: 'Group Machine > Machine > Delete Message > Bogus example name',
      id: 'POST /machines',
      host: '127.0.0.1',
      port: '3000',
      request: {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Dredd/0.2.1 (Darwin 13.0.0; x64)'
        },
        uri: '/machines',
        method: 'POST'
      },
      expected: {
        headers: { 'content-type': 'application/json'
      },
        status: '202',
        body: bodyFixture
      },
      origin: {
        resourceGroupName: 'Group Machine',
        resourceName: 'Machine',
        actionName: 'Delete Message',
        exampleName: 'Bogus example name'
      },
      fullPath: '/machines',
      protocol: 'http:'
    };

    const scenarios = [{
        name: 'Content-Length is not set, body is not set',
        headers: {},
        body: '',
        warning: false
      }
      , {
        name: 'Content-Length is set, body is not set',
        headers: {'Content-Length': 0},
        body: '',
        warning: false
      }
      , {
        name: 'Content-Length is not set, body is set',
        headers: {},
        body: bodyFixture,
        warning: false
      }
      , {
        name: 'Content-Length is set, body is set',
        headers: {'Content-Length': bodyFixture.length},
        body: bodyFixture,
        warning: false
      }
      , {
        name: 'Content-Length has wrong value, body is not set',
        headers: {'Content-Length': bodyFixture.length},
        body: '',
        warning: true
      }
      , {
        name: 'Content-Length has wrong value, body is set',
        headers: {'Content-Length': 0},
        body: bodyFixture,
        warning: true
      }
      , {
        name: 'case of the header name does not matter',
        headers: {'CoNtEnT-lEnGtH': bodyFixture.length},
        body: bodyFixture,
        warning: false
      }
    ];

    return scenarios.forEach(scenario =>
      describe(scenario.name, function() {
        const expectedContentLength = scenario.body.length;
        let realRequest = undefined;
        let loggerSpy = undefined;

        beforeEach(function(done) {
          loggerSpy = sinon.spy(loggerStub, 'warn');

          transaction = clone(transactionFixture);
          transaction.request.body = scenario.body;
          for (let name in scenario.headers) {
            const value = scenario.headers[name];
            transaction.request.headers[name] = value;
          }

          nock('http://127.0.0.1:3000').
            post('/machines').
            reply(transaction.expected.status, function() {
              realRequest = this.req;
              return scenario.body;
            });

          return runner.executeTransaction(transaction, done);
        });
        afterEach( function() {
          nock.cleanAll();
          return loggerSpy.restore();
        });

        if (scenario.warning) {
          it('warns about discrepancy between provided Content-Length and real body length', function() {
            assert.isTrue(loggerSpy.calledOnce);

            const message = loggerSpy.getCall(0).args[0].toLowerCase();
            assert.include(message, `the real body length is ${expectedContentLength}`);
            return assert.include(message, `using ${expectedContentLength} instead`);
          });
        } else {
          it('does not warn', () => assert.isFalse(loggerSpy.called));
        }

        context('the real request', function() {
          it('has the Content-Length header', () => assert.isOk(caseless(realRequest.headers).has('Content-Length')));
          return it(`has the Content-Length header set to ${expectedContentLength}`, () =>
            assert.equal(
              caseless(realRequest.headers).get('Content-Length'),
              expectedContentLength
            )
          );
        });
        return context('the transaction object', function() {
          it('has the Content-Length header', () => assert.isOk(caseless(transaction.request.headers).has('Content-Length')));
          return it(`has the Content-Length header set to ${expectedContentLength}`, () =>
            assert.equal(
              caseless(transaction.request.headers).get('Content-Length'),
              expectedContentLength
            )
          );
        });
      })
    );
  });

  describe('exceuteAllTransactions(transactions, hooks, callback)', function() {
    runner = null;
    let hooks = null;
    let transactions = [];
    let serverNock1 = null;
    let serverNock2 = null;
    let returnedError = null;
    let spies = {};

    beforeEach(function() {
      returnedError = null;
      transactions = [];

      for (var name of ['1', '2']) {
        transaction = clone({
          name,
          id: `POST /machines${name}`,
          host: '127.0.0.1',
          port: '3000',
          request: {
            body: '{\n  "type": "bulldozer",\n  "name": "willy"}\n',
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'Dredd/0.2.1 (Darwin 13.0.0; x64)',
              'Content-Length': 44
            },
            uri: `/machines${name}`,
            method: 'POST'
          },
          expected: {
            headers: { 'content-type': 'application/json'
          },
            body: '{\n  "type": "bulldozer",\n  "name": "willy",\n  "id": "5229c6e8e4b0bd7dbb07e29c"\n}\n',
            statusCode: '202'
          },
          origin: {
            resourceGroupName: 'Group Machine',
            resourceName: 'Machine',
            actionName: 'Delete Message',
            exampleName: 'Bogus example name'
          },
          fullPath: `/machines${name}`,
          protocol: 'http:'
        });

        transactions.push(transaction);
      }

      runner = new Runner(configuration);
      hooks = new Hooks({logs: [], logger: console});

      const spyNames = [
        'beforeAllSpy',
        'beforeEachSpy',
        'beforeEachValidationSpy',
        'beforeSpy',
        'beforeValidationSpy',
        'afterSpy',
        'afterEachSpy',
        'afterAllSpy'
      ];

      spies = {};
      for (name of spyNames) {
        spies[name] = (data, hooksCallback) => hooksCallback();
        sinon.stub(spies, name).callsFake((data, hooksCallback) => hooksCallback());
      }

      hooks.beforeAll(spies.beforeAllSpy);
      hooks.beforeEach(spies.beforeEachSpy);
      hooks.beforeEachValidation(spies.beforeEachValidationSpy);
      hooks.before('1', spies.beforeSpy);
      hooks.before('2', spies.beforeSpy);
      hooks.beforeValidation('1', spies.beforeValidationSpy);
      hooks.beforeValidation('2', spies.beforeValidationSpy);
      hooks.after('1', spies.afterSpy);
      hooks.after('2', spies.afterSpy);
      hooks.afterEach(spies.afterEachSpy);
      hooks.afterAll(spies.afterAllSpy);

      runner.hooks = hooks;

      serverNock1 = nock('http://127.0.0.1:3000').
        post('/machines1', {"type":"bulldozer", "name":"willy"}).
        reply(transaction['expected']['statusCode'],
          transaction['expected']['body'],
          {'Content-Type': 'application/json'});

      return serverNock2 = nock('http://127.0.0.1:3000').
        post('/machines2', {"type":"bulldozer", "name":"willy"}).
        reply(transaction['expected']['statusCode'],
          transaction['expected']['body'],
          {'Content-Type': 'application/json'});});

    afterEach(function() {
      nock.cleanAll();

      for (let name in spies) { const spy = spies[name]; ((name, spy) => spies[name].restore())(name, spy); }

      runner = null;
      hooks = null;
      transactions = [];
      serverNock1 = null;
      serverNock2 = null;
      returnedError = null;
      return spies = {};});

    return describe('when the hooks handler is used', function() {
      describe("and it doesn't crash", function() {

        it('should perform all transactions', done =>
          runner.executeAllTransactions(transactions, hooks, function(error) {
            if (error) { return done(error); }
            assert.isTrue(serverNock1.isDone(), 'first resource');
            assert.isTrue(serverNock2.isDone(), 'second resource');
            return done();
          })
        );

        it('should execute all ‘all’ hooks once', done =>

          runner.executeAllTransactions(transactions, hooks, function(error) {
            if (error) { return done(error); }
            for (let spyName in spies) {
              const spy = spies[spyName];
              if (spyName !== 'beforeAllSpy') { break; }
              if (spyName !== 'afterAllSpy') { break; }
              assert.isTrue(spies[spyName].called, spyName);
            }
            return done();
          })
        );

        return it('should execute all other hooks once', done =>

          runner.executeAllTransactions(transactions, hooks, function(error) {
            if (error) { return done(error); }
            for (let spyName in spies) {
              const spy = spies[spyName];
              if (spyName !== 'beforeAllSpy') { break; }
              if (spyName !== 'afterAllSpy') { break; }
              assert.isTrue(spies[spyName].calledTwice, spyName);
            }
            return done();
          })
        );
      });

      return describe('and it crashes (hook handler error was set)', function() {
        describe('before any hook is executed', function() {
          beforeEach(function(done) {
            runner.hookHandlerError = new Error('handler died in before everything');
            return runner.executeAllTransactions(transactions, hooks, function(error) {
              //setting expectation for this error below in each describe block
              returnedError = error;
              return done();
            });
          });

          it('should not perform any transaction', function() {
            assert.isFalse(serverNock1.isDone(), 'first resource');
            return assert.isFalse(serverNock2.isDone(), 'second resource');
          });

          it('should not perform any hooks', () =>
            (() => {
              const result = [];
              for (let spyName of Object.keys(spies || {})) {
                const spy = spies[spyName];
                result.push(assert.isFalse(spies[spyName].called, spyName));
              }
              return result;
            })()
          );

          return it('should return the error', () => assert.include(returnedError.message, 'everything'));
        });

        describe('after ‘beforeAll’ hook is executed', function() {
          beforeEach(function(done) {
            const hookHandlerError = new Error('handler died in beforeAll');

            hooks.beforeAll(function(data, callback) {
              runner.hookHandlerError = hookHandlerError;
              return callback();
            });

            return runner.executeAllTransactions(transactions, hooks, function(error) {
              //setting expectation for this error below in each describe block
              returnedError = error;
              return done();
            });
          });

          it('should perform the ‘beforeAll’ hook', () => assert.isTrue(spies.beforeAllSpy.called));

          it('should not perform any other hook', () =>
            (() => {
              const result = [];
              for (let spyName of Object.keys(spies || {})) {
                const spy = spies[spyName];
                if (spyName === 'beforeAllSpy') { break; }
                result.push(assert.isFalse(spies[spyName].called, spyName));
              }
              return result;
            })()
          );

          it('should not perform any transaction', function() {
            assert.isFalse(serverNock1.isDone(), 'first resource');
            return assert.isFalse(serverNock2.isDone(), 'second resource');
          });

          return it('should return the error', () => assert.include(returnedError.message, 'beforeAll'));
        });

        describe('after ‘beforeEach’ hook is executed', function() {
          beforeEach(function(done) {
            const hookHandlerError = new Error('handler died in beforeEach');

            hooks.beforeEach(function(data, callback) {
              runner.hookHandlerError = hookHandlerError;
              return callback();
            });

            return runner.executeAllTransactions(transactions, hooks, function(error) {
              //setting expectation for this error below in each describe block
              returnedError = error;
              return done();
            });
          });

          it('should perform the ‘beforeAll’ hook', () => assert.isTrue(spies.beforeAllSpy.called));

          it('should perform the ‘beforeEach’ hook', () => assert.isTrue(spies.beforeEachSpy.calledOnce));

          it('should not perform any other hook', () =>
            (() => {
              const result = [];
              for (let spyName of Object.keys(spies || {})) {
                const spy = spies[spyName];
                if (spyName === 'beforeAllSpy') { break; }
                if (spyName === 'beforeEachSpy') { break; }
                result.push(assert.isFalse(spies[spyName].called, spyName));
              }
              return result;
            })()
          );

          it('should not perform any transaction', function() {
            assert.isFalse(serverNock1.isDone(), 'first resource');
            return assert.isFalse(serverNock2.isDone(), 'second resource');
          });

          return it('should return the error', () => assert.include(returnedError.message, 'beforeEach'));
        });

        describe('after ‘before’ hook is executed', function() {
          beforeEach(function(done) {
            const hookHandlerError = new Error('handler died in before 1');

            hooks.before('1', function(data, callback) {
              runner.hookHandlerError = hookHandlerError;
              return callback();
            });

            return runner.executeAllTransactions(transactions, hooks, function(error) {
              //setting expectation for this error below in each describe block
              returnedError = error;
              return done();
            });
          });

          it('should perform the ‘beforeAll’ hook', () => assert.isTrue(spies.beforeAllSpy.called));

          it('should perform the ‘beforeEach’ hook', () => assert.isTrue(spies.beforeEachSpy.calledOnce));

          it('should perform the ‘before’ hook', () => assert.isTrue(spies.beforeSpy.calledOnce));

          it('should not perform any other hook', () =>
            (() => {
              const result = [];
              for (let spyName of Object.keys(spies || {})) {
                const spy = spies[spyName];
                if (spyName === 'beforeAllSpy') { break; }
                if (spyName === 'beforeEachSpy') { break; }
                if (spyName === 'beforeSpy') { break; }
                result.push(assert.isFalse(spies[spyName].called, spyName));
              }
              return result;
            })()
          );

          it('should not perform any transaction', function() {
            assert.isFalse(serverNock1.isDone(), 'first resource');
            return assert.isFalse(serverNock2.isDone(), 'second resource');
          });

          return it('should return the error', () => assert.include(returnedError.message, 'before 1'));
        });

        describe('after ‘beforeEachValidation’ hook is executed', function() {
          beforeEach(function(done) {
            const hookHandlerError = new Error('handler died in before each validation');

            hooks.beforeEachValidation(function(data, callback) {
              runner.hookHandlerError = hookHandlerError;
              return callback();
            });

            return runner.executeAllTransactions(transactions, hooks, function(error) {
              //setting expectation for this error below in each describe block
              returnedError = error;
              return done();
            });
          });

          it('should perform the ‘beforeAll’ hook', () => assert.equal(spies.beforeAllSpy.callCount, 1));

          it('should perform the ‘beforeEach’ hook', () => assert.equal(spies.beforeEachSpy.callCount, 1));

          it('should perform the ‘before’ hook', () => assert.equal(spies.beforeSpy.callCount, 1));

          it('should perform the ‘beforeEachValidation’ hook', () => assert.equal(spies.beforeEachValidationSpy.callCount, 1));

          it('should not perform any other hook', () =>
            (() => {
              const result = [];
              for (let spyName of Object.keys(spies || {})) {
                const spy = spies[spyName];
                if (spyName === 'beforeAllSpy') { break; }
                if (spyName === 'beforeEachSpy') { break; }
                if (spyName === 'beforeSpy') { break; }
                if (spyName === 'beforeEachValidationSpy') { break; }

                result.push(assert.isFalse(spies[spyName].called, spyName));
              }
              return result;
            })()
          );

          it('should perform only the first transaction', function() {
            assert.isTrue(serverNock1.isDone(), 'first resource');
            return assert.isFalse(serverNock2.isDone(), 'second resource');
          });

          return it('should return the error', () => assert.include(returnedError.message, 'before each validation'));
        });

        describe('after ‘beforeValidation’ hook is executed', function() {
          beforeEach(function(done) {
            const hookHandlerError = new Error('handler died in before validation 1');

            hooks.beforeValidation('1', function(data, callback) {
              runner.hookHandlerError = hookHandlerError;
              return callback();
            });

            return runner.executeAllTransactions(transactions, hooks, function(error) {
              //setting expectation for this error below in each describe block
              returnedError = error;
              return done();
            });
          });

          it('should perform the ‘beforeAll’ hook', () => assert.isTrue(spies.beforeAllSpy.called));

          it('should perform the ‘beforeEach’ hook', () => assert.isTrue(spies.beforeEachSpy.calledOnce));

          it('should perform the ‘before’ hook', () => assert.isTrue(spies.beforeSpy.calledOnce));

          it('should perform the ‘beforeEachValidation’ hook', () => assert.isTrue(spies.beforeEachValidationSpy.calledOnce));

          it('should perform the ‘beforeValidation’ hook', () => assert.isTrue(spies.beforeValidationSpy.calledOnce));

          it('should not perform any other hook', () =>
            (() => {
              const result = [];
              for (let spyName of Object.keys(spies || {})) {
                const spy = spies[spyName];
                if (spyName === 'beforeAllSpy') { break; }
                if (spyName === 'beforeEachSpy') { break; }
                if (spyName === 'beforeSpy') { break; }
                if (spyName === 'beforeEachValidationSpy') { break; }
                if (spyName === 'beforeValidationSpy') { break; }

                result.push(assert.isFalse(spies[spyName].called, spyName));
              }
              return result;
            })()
          );

          it('should perform only first transaction', function() {
            assert.isTrue(serverNock1.isDone(), 'first resource');
            return assert.isFalse(serverNock2.isDone(), 'second resource');
          });

          return it('should return the error', () => assert.include(returnedError.message, 'before validation 1'));
        });

        describe('after ‘after’ hook is executed', function() {
          beforeEach(function(done) {
            const hookHandlerError = new Error('handler died in after 1');

            hooks.after('1', function(data, callback) {
              runner.hookHandlerError = hookHandlerError;
              return callback();
            });

            return runner.executeAllTransactions(transactions, hooks, function(error) {
              //setting expectation for this error below in each describe block
              returnedError = error;
              return done();
            });
          });

          it('should perform the ‘beforeAll’ hook', () => assert.isTrue(spies.beforeAllSpy.called));

          it('should perform the ‘beforeEach’ hook', () => assert.isTrue(spies.beforeEachSpy.calledOnce));

          it('should perform the ‘before’ hook', () => assert.isTrue(spies.beforeSpy.calledOnce));

          it('should perform the ‘beforeEachValidation’ hook', () => assert.isTrue(spies.beforeEachValidationSpy.calledOnce));

          it('should perform the ‘beforeValidation’ hook', () => assert.isTrue(spies.beforeValidationSpy.calledOnce));

          it('should perform the ‘afterEach’ hook', () => assert.isTrue(spies.afterEachSpy.calledOnce));

          it('should perform the ‘after’ hook', () => assert.isTrue(spies.afterSpy.calledOnce));

          it('should not perform any other hook', () =>
            (() => {
              const result = [];
              for (let spyName of Object.keys(spies || {})) {
                const spy = spies[spyName];
                if (spyName === 'beforeAllSpy') { break; }
                if (spyName === 'beforeEachSpy') { break; }
                if (spyName === 'beforeSpy') { break; }
                if (spyName === 'beforeEachValidationSpy') { break; }
                if (spyName === 'beforeValidationSpy') { break; }
                if (spyName === 'after') { break; }
                result.push(assert.isFalse(spies[spyName].called, spyName));
              }
              return result;
            })()
          );

          it('should not perform any other transaction', function() {
            assert.isTrue(serverNock1.isDone(), 'first resource');
            return assert.isFalse(serverNock2.isDone(), 'second resource');
          });

          return it('should return the error', () => assert.include(returnedError.message, 'after 1'));
        });

        describe('after ‘afterEach’ hook is executed', function() {
          beforeEach(function(done) {
            const hookHandlerError = new Error('handler died in after each');

            hooks.afterEach(function(data, callback) {
              runner.hookHandlerError = hookHandlerError;
              return callback();
            });

            return runner.executeAllTransactions(transactions, hooks, function(error) {
              //setting expectation for this error below in each describe block
              returnedError = error;
              return done();
            });
          });

          it('should perform the ‘beforeAll’ hook', () => assert.isTrue(spies.beforeAllSpy.called));

          it('should perform the ‘beforeEach’ hook', () => assert.isTrue(spies.beforeEachSpy.calledOnce));

          it('should perform the ‘before’ hook', () => assert.isTrue(spies.beforeSpy.calledOnce));

          it('should perform the ‘beforeEachValidation’ hook', () => assert.isTrue(spies.beforeEachValidationSpy.calledOnce));

          it('should perform the ‘beforeValidation’ hook', () => assert.isTrue(spies.beforeValidationSpy.calledOnce));

          it('should perform the ‘afterEach’ hook', () => assert.isTrue(spies.afterEachSpy.calledOnce));

          it('should not perform any other hook', () =>
            (() => {
              const result = [];
              for (let spyName of Object.keys(spies || {})) {
                const spy = spies[spyName];
                if (spyName === 'beforeAllSpy') { break; }
                if (spyName === 'beforeEachSpy') { break; }
                if (spyName === 'beforeSpy') { break; }
                if (spyName === 'beforeEachValidationSpy') { break; }
                if (spyName === 'beforeValidationSpy') { break; }
                if (spyName === 'after') { break; }
                if (spyName === 'afterEach') { break; }
                result.push(assert.isFalse(spies[spyName].called, spyName));
              }
              return result;
            })()
          );

          it('should not perform any other transaction', function() {
            assert.isTrue(serverNock1.isDone(), 'first resource');
            return assert.isFalse(serverNock2.isDone(), 'second resource');
          });

          return it('should return the error', () => assert.include(returnedError.message, 'after each'));
        });

        return describe('after ‘afterAll’ hook is executed', function() {
          beforeEach(function(done) {
            const hookHandlerError = new Error('handler died in after all');

            hooks.afterAll(function(data, callback) {
              runner.hookHandlerError = hookHandlerError;
              return callback();
            });

            return runner.executeAllTransactions(transactions, hooks, function(error) {
              //setting expectation for this error below in each describe block
              returnedError = error;
              return done();
            });
          });

          it('should perform the ‘beforeAll’ hook', () => assert.isTrue(spies.beforeAllSpy.called));

          it('should perform the ‘beforeEach’ hook', () => assert.isTrue(spies.beforeEachSpy.calledTwice));

          it('should perform the ‘before’ hook', () => assert.isTrue(spies.beforeSpy.calledTwice));

          it('should perform the ‘beforeEachValidation’ hook', () => assert.isTrue(spies.beforeEachValidationSpy.calledTwice));

          it('should perform the ‘beforeValidation’ hook', () => assert.isTrue(spies.beforeValidationSpy.calledTwice));

          it('should perform the ‘afterEach’ hook', () => assert.isTrue(spies.afterEachSpy.calledTwice));

          it('should perform the ‘after’ hook', () => assert.isTrue(spies.afterSpy.calledTwice));

          it('should perform the ‘afterAll’ hook', () => assert.isTrue(spies.afterAllSpy.calledOnce));

          it('should perform both transactions', function() {
            assert.isTrue(serverNock1.isDone(), 'first resource');
            return assert.isTrue(serverNock2.isDone(), 'second resource');
          });

          return it('should return the error', () => assert.include(returnedError.message, 'after all'));
        });
      });
    });
  });

  describe('executeTransaction(transaction, callback) multipart', function() {
    let multiPartTransaction = null;
    let notMultiPartTransaction = null;
    runner = null;
    beforeEach(function() {
      runner = new Runner(configuration);
      multiPartTransaction = {
          name: 'Group Machine > Machine > Post Message> Bogus example name',
          id: 'POST /machines/message',
          host: '127.0.0.1',
          port: '3000',
          request: {
            body: '\n--BOUNDARY \ncontent-disposition: form-data; name="mess12"\n\n{"message":"mess1"}\n--BOUNDARY\n\nContent-Disposition: form-data; name="mess2"\n\n{"message":"mess1"}\n--BOUNDARY--',
            headers: {
              'Content-Type': 'multipart/form-data; boundary=BOUNDARY',
              'User-Agent': 'Dredd/0.2.1 (Darwin 13.0.0; x64)',
              'Content-Length': 180
            },
            uri: '/machines/message',
            method: 'POST'
          },
          expected: {
            headers: {
              'content-type': 'text/htm'
            }
          },
          body: '',
          status: '204',
          origin: {
            resourceGroupName: 'Group Machine',
            resourceName: 'Machine',
            actionName: 'Post Message',
            exampleName: 'Bogus example name'
          },
          fullPath: '/machines/message',
          protocol: 'http:'
        };

      return notMultiPartTransaction = {
          name: 'Group Machine > Machine > Post Message> Bogus example name',
          id: 'POST /machines/message',
          host: '127.0.0.1',
          port: '3000',
          request: {
            body: '\n--BOUNDARY \ncontent-disposition: form-data; name="mess12"\n\n{"message":"mess1"}\n--BOUNDARY\n\nContent-Disposition: form-data; name="mess2"\n\n{"message":"mess1"}\n--BOUNDARY--',
            headers: {
              'Content-Type': 'text/plain',
              'User-Agent': 'Dredd/0.2.1 (Darwin 13.0.0; x64)',
              'Content-Length': 180
            },
            uri: '/machines/message',
            method: 'POST'
          },
          expected: {
            headers: {
              'content-type': 'text/htm'
            }
          },
          body: '',
          status: '204',
          origin: {
            resourceGroupName: 'Group Machine',
            resourceName: 'Machine',
            actionName: 'Post Message',
            exampleName: 'Bogus example name'
          },
          fullPath: '/machines/message',
          protocol: 'http:'
        };
    });

    describe('when multipart header in request', function() {

      const parsedBody = '\r\n--BOUNDARY \r\ncontent-disposition: form-data; name="mess12"\r\n\r\n{"message":"mess1"}\r\n--BOUNDARY\r\n\r\nContent-Disposition: form-data; name="mess2"\r\n\r\n{"message":"mess1"}\r\n--BOUNDARY--';
      beforeEach(function() {
        server = nock('http://127.0.0.1:3000').
        post('/machines/message').
        reply(204);
        return configuration.server = 'http://127.0.0.1:3000';
      });

      afterEach(() => nock.cleanAll());

      return it('should replace line feed in body', done =>
        runner.executeTransaction(multiPartTransaction, function() {
          assert.isOk(server.isDone());
          assert.equal(multiPartTransaction['request']['body'], parsedBody, 'Body');
          assert.include(multiPartTransaction['request']['body'], "\r\n");
          return done();
        })
      );
    });

    describe('when multipart header in request is with lowercase key', function() {

      const parsedBody = '\r\n--BOUNDARY \r\ncontent-disposition: form-data; name="mess12"\r\n\r\n{"message":"mess1"}\r\n--BOUNDARY\r\n\r\nContent-Disposition: form-data; name="mess2"\r\n\r\n{"message":"mess1"}\r\n--BOUNDARY--';
      beforeEach(function() {
        server = nock('http://127.0.0.1:3000').
        post('/machines/message').
        reply(204);
        configuration.server = 'http://127.0.0.1:3000';

        delete multiPartTransaction['request']['headers']['Content-Type'];
        return multiPartTransaction['request']['headers']['content-type'] = 'multipart/form-data; boundary=BOUNDARY';
      });

      afterEach(() => nock.cleanAll());

      return it('should replace line feed in body', done =>
        runner.executeTransaction(multiPartTransaction, function() {
          assert.isOk(server.isDone());
          assert.equal(multiPartTransaction['request']['body'], parsedBody, 'Body');
          assert.include(multiPartTransaction['request']['body'], "\r\n");
          return done();
        })
      );
    });

    describe('when multipart header in request, but body already has some CR (added in hooks e.g.s)', function() {
      beforeEach(function() {
        server = nock('http://127.0.0.1:3000').
        post('/machines/message').
        reply(204);
        configuration.server = 'http://127.0.0.1:3000';
        return multiPartTransaction['request']['body'] = '\r\n--BOUNDARY \r\ncontent-disposition: form-data; name="mess12"\r\n\r\n{"message":"mess1"}\r\n--BOUNDARY\r\n\r\nContent-Disposition: form-data; name="mess2"\r\n\r\n{"message":"mess1"}\r\n--BOUNDARY--';
      });

      afterEach(() => nock.cleanAll());

      return it('should not add CR again', done =>
        runner.executeTransaction(multiPartTransaction, function() {
          assert.isOk(server.isDone());
          assert.notInclude(multiPartTransaction['request']['body'], "\r\r");
          return done();
        })
      );
    });

    return describe('when multipart header is not in request', function() {
      beforeEach(function() {
        server = nock('http://127.0.0.1:3000').
        post('/machines/message').
        reply(204);
        return configuration.server = 'http://127.0.0.1:3000';
      });

      afterEach(() => nock.cleanAll());

      return it('should not include any line-feed in body', done =>
        runner.executeTransaction(notMultiPartTransaction, function() {
          assert.isOk(server.isDone());
          assert.notInclude(multiPartTransaction['request']['body'], "\r\n");
          return done();
        })
      );
    });
  });

  describe('#executeAllTransactions', function() {

    configuration = {
      server: 'http://127.0.0.1:3000',
      emitter: new EventEmitter(),
      options: {
        'dry-run': false,
        method: [],
        header: [],
        reporter:  [],
        only: []
      }
    };
        // do not actually search & load hookfiles from disk
        // hookfiles: './**/*_hooks.*'

    transaction = {};
    let transactions = {};

    beforeEach(function(done) {
      transaction = clone({
        name: 'Group Machine > Machine > Delete Message > Bogus example name',
        id: 'POST /machines',
        host: '127.0.0.1',
        port: '3000',
        request: {
          body: '{\n  "type": "bulldozer",\n  "name": "willy"}\n',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Dredd/0.2.1 (Darwin 13.0.0; x64)',
            'Content-Length': 44
          },
          uri: '/machines',
          method: 'POST'
        },
        expected: {
          headers: { 'content-type': 'application/json'
        },
          body: '{\n  "type": "bulldozer",\n "name": "willy",\n  "id": "5229c6e8e4b0bd7dbb07e29c"\n}\n',
          statusCode: '202'
        },
        origin: {
          resourceGroupName: 'Group Machine',
          resourceName: 'Machine',
          actionName: 'Delete Message',
          exampleName: 'Bogus example name'
        },
        fullPath: '/machines',
        protocol: 'http:'
      });

      server = nock('http://127.0.0.1:3000').
        post('/machines', {"type":"bulldozer", "name":"willy"}).
        reply(transaction['expected']['statusCode'],
          transaction['expected']['body'],
          {'Content-Type': 'application/json'});

      transactions = {};
      transactions[transaction.name] = clone(transaction, false);
      runner = new Runner(configuration);
      return addHooks(runner, transactions, done);
    });

    afterEach(() => nock.cleanAll());

    describe('with hooks', function() {
      beforeEach(function() {
        sinon.spy(loggerStub, 'info');
        runner.hooks.beforeHooks = {
          'Group Machine > Machine > Delete Message > Bogus example name': [
            transaction => loggerStub.info("before")
          ]
        };
        runner.hooks.beforeValidationHooks = {
          'Group Machine > Machine > Delete Message > Bogus example name': [
            transaction => loggerStub.info("beforeValidation")
          ]
        };
        return runner.hooks.afterHooks = {
          'Group Machine > Machine > Delete Message > Bogus example name': [
            function(transaction, done) {
              loggerStub.info("after");
              return done();
            }
          ]
        };});

      afterEach(() => loggerStub.info.restore());

      return it('should run the hooks', done =>
        runner.executeAllTransactions([transaction], runner.hooks, function() {
          assert.isOk(loggerStub.info.calledWith("before"));
          assert.isOk(loggerStub.info.calledWith("beforeValidation"));
          assert.isOk(loggerStub.info.calledWith("after"));
          return done();
        })
      );
    });

    describe('with hooks, but without hooks.transactions set', function() {
      beforeEach(function() {
        sinon.spy(loggerStub, 'info');
        runner.hooks.transactions = null;
        runner.hooks.beforeHooks = {
          'Group Machine > Machine > Delete Message > Bogus example name' : [
            transaction => loggerStub.info("before")
          ]
        };
        runner.hooks.beforeValidationHooks = {
          'Group Machine > Machine > Delete Message > Bogus example name' : [
            transaction => loggerStub.info("beforeValidation")
          ]
        };
        return runner.hooks.afterHooks = {
          'Group Machine > Machine > Delete Message > Bogus example name' : [
            function(transaction, done) {
              loggerStub.info("after");
              return done();
            }
          ]
        };});

      afterEach(() => loggerStub.info.restore());

      return it('should run the hooks', function(done) {
        runner.hooks.transactions = null;
        return runner.executeAllTransactions([transaction], runner.hooks, function() {
          assert.isOk(loggerStub.info.calledWith("before"));
          assert.isOk(loggerStub.info.calledWith("beforeValidation"));
          assert.isOk(loggerStub.info.calledWith("after"));
          return done();
        });
      });
    });

    describe('with multiple hooks for the same transaction', function() {
      beforeEach(function() {
        sinon.spy(loggerStub, 'info');
        return runner.hooks.beforeHooks = {
          'Group Machine > Machine > Delete Message > Bogus example name' : [
            transaction => loggerStub.info("first"),
            function(transaction, cb) {
              loggerStub.info("second");
              return cb();
            }
          ]
        };});

      afterEach(() => loggerStub.info.restore());

      return it('should run all hooks', done =>
        runner.executeAllTransactions([transaction], runner.hooks, function() {
          assert.isOk(loggerStub.info.calledWith("first"));
          assert.isOk(loggerStub.info.calledWith("second"));
          return done();
        })
      );
    });

    describe('‘*All’ hooks with legacy async interface (fist argument is a callback)', function() {
      describe('with a ‘beforeAll’ hook', function() {
        const legacyApiFunction = callback => callback();
        const anotherLegacyApiFunction = cb => cb();

        const beforeAllStub = sinon.spy(legacyApiFunction);
        const beforeAllStubAnother = sinon.spy(anotherLegacyApiFunction);

        beforeEach(function() {
          runner.hooks.beforeAll(beforeAllStub);
          return runner.hooks.beforeAll(beforeAllStubAnother);
        });

        return it('should run the hooks', done =>
          runner.executeAllTransactions([], runner.hooks, function() {
            assert.isOk(beforeAllStub.called);
            assert.isOk(beforeAllStubAnother.called);
            return done();
          })
        );
      });

      describe('with an ‘afterAll’ hook', function() {
        const legacyApiFunction = callback => callback();
        const anotherLegacyApiFunction = cb => cb();

        const afterAllStub = sinon.spy(legacyApiFunction);
        const afterAllStubAnother = sinon.spy(anotherLegacyApiFunction);

        beforeEach(function() {
          runner.hooks.afterAll(afterAllStub);
          return runner.hooks.afterAll(afterAllStubAnother);
        });

        return it('should run the hooks', done =>
          runner.executeAllTransactions([], runner.hooks, function() {
            assert.isOk(afterAllStub.called);
            assert.isOk(afterAllStubAnother.called);
            return done();
          })
        );
      });

      return describe('with multiple hooks for the same events', function() {
        const legacyApiFunction = callback => callback();

        const beforeAllStub1 = sinon.spy(legacyApiFunction);
        const beforeAllStub2 = sinon.spy(legacyApiFunction);
        const afterAllStub1 = sinon.spy(legacyApiFunction);
        const afterAllStub2 = sinon.spy(legacyApiFunction);

        beforeEach(function() {
          runner.hooks.beforeAll(beforeAllStub1);
          runner.hooks.afterAll(afterAllStub1);
          runner.hooks.afterAll(afterAllStub2);
          return runner.hooks.beforeAll(beforeAllStub2);
        });

        return it('should run all the events in order', done =>
          runner.executeAllTransactions([], runner.hooks, function() {
            assert.isOk(beforeAllStub1.calledBefore(beforeAllStub2));
            assert.isOk(beforeAllStub2.called);
            assert.isOk(beforeAllStub2.calledBefore(afterAllStub1));
            assert.isOk(afterAllStub1.calledBefore(afterAllStub2));
            assert.isOk(afterAllStub2.called);
            return done();
          })
        );
      });
    });

    describe('‘*All’ hooks with standard async API (first argument transactions, second callback)', function() {

      describe('with a ‘beforeAll’ hook', function() {
        const hook = (transactions, callback) => callback();

        const beforeAllStub = sinon.spy(hook);

        beforeEach(() => runner.hooks.beforeAll(beforeAllStub));

        return it('should run the hooks', done =>
          runner.executeAllTransactions([], runner.hooks, function() {
            assert.isOk(beforeAllStub.called);
            return done();
          })
        );
      });

      describe('with an ‘afterAll’ hook', function() {
        const hook = (transactions, callback) => callback();

        const afterAllStub = sinon.spy(hook);

        beforeEach(() => runner.hooks.afterAll(afterAllStub));

        return it('should run the hooks', done =>
          runner.executeAllTransactions([], runner.hooks, function() {
            assert.isOk(afterAllStub.called);
            return done();
          })
        );
      });

      return describe('with multiple hooks for the same events', function() {
        const hook = (transactions, callback) => callback();

        const beforeAllStub1 = sinon.spy(hook);
        const beforeAllStub2 = sinon.spy(hook);
        const afterAllStub1 = sinon.spy(hook);
        const afterAllStub2 = sinon.spy(hook);

        beforeEach(function() {
          runner.hooks.beforeAll(beforeAllStub1);
          runner.hooks.afterAll(afterAllStub1);
          runner.hooks.afterAll(afterAllStub2);
          return runner.hooks.beforeAll(beforeAllStub2);
        });

        return it('should run all the events in order', done =>
          runner.executeAllTransactions([], runner.hooks, function() {
            assert.isOk(beforeAllStub1.calledBefore(beforeAllStub2));
            assert.isOk(beforeAllStub2.called);
            assert.isOk(beforeAllStub2.calledBefore(afterAllStub1));
            assert.isOk(afterAllStub1.calledBefore(afterAllStub2));
            assert.isOk(afterAllStub2.called);
            return done();
          })
        );
      });
    });

    describe('‘*All’ hooks with sandboxed API (functions as strings)', () =>
      describe('with a ‘beforeAll’ hook', function() {

        beforeEach(() =>
          // coffeelint: disable=no_empty_functions
          sinon.stub(configuration.emitter, 'emit').callsFake( function() { })
        );
          // coffeelint: enable=no_empty_functions

        afterEach(() => configuration.emitter.emit.restore());

        it('should run the code and emit an error', function(done) {
          const functionString = `\
function(transactions){
  throw(new Error('Exploded inside sandbox'));
}\
`;
          runner.hooks.beforeAll(functionString);

          return runner.executeAllTransactions([], runner.hooks, function(err) {
            const call = configuration.emitter.emit.getCall(0);
            assert.isOk(configuration.emitter.emit.calledWith("test error"));
            return done(err);
          });
        });

        it('should not have access to require', function(done) {
          const functionString = `\
function(transactions){
  require('fs');
}\
`;
          runner.hooks.beforeAll(functionString);

          return runner.executeAllTransactions([], runner.hooks, function(err) {
            const call = configuration.emitter.emit.getCall(0);
            assert.isOk(configuration.emitter.emit.calledWith("test error"));
            assert.include(call.args[1].message, 'require');
            return done(err);
          });
        });

        it('should not have access to current context', function(done) {
          const contextVar = "this";
          const functionString = `\
function(transactions){
  contextVar = "that";
}\
`;
          runner.hooks.beforeAll(functionString);

          return runner.executeAllTransactions([], runner.hooks, function(err) {
            assert.equal(contextVar, 'this');
            return done(err);
          });
        });

        it('should have access to the hook stash', function(done) {
          const functionString = `\
function(transactions){
  stash.prop = 'that';
}\
`;
          runner.hooks.beforeAll(functionString);

          return runner.executeAllTransactions([], runner.hooks, function(err) {
            assert.notOk(configuration.emitter.emit.calledWith("test error"));
            return done(err);
          });
        });

        it('should be able to modify hook stash', function(done) {
          const functionString = `\
function(transactions){
  stash.prop = 'that';
}\
`;
          runner.hooks.beforeAll(functionString);

          return runner.executeAllTransactions([], runner.hooks, function(err) {
            assert.notOk(configuration.emitter.emit.calledWith("test error"));
            assert.property(runner.hookStash, 'prop');
            return done(err);
          });
        });

        it('should be able to modify transactions', function(done) {
          const functionString = `\
function(transactions){
  transactions[0].name = 'Changed!';
}\
`;
          runner.hooks.beforeAll(functionString);

          transactions = [{
            name: 'Test!',
            request: {headers: {}, body: ''},
            skip: true
          }
          ];

          return runner.executeAllTransactions(transactions, runner.hooks, function(err) {
            const call = configuration.emitter.emit.getCall(0);
            assert.notOk(configuration.emitter.emit.calledWith("test error"));
            assert.equal(transactions[0].name, 'Changed!');
            return done(err);
          });
        });

        return it('should be able to call "log" from inside the function', function(done) {
          const functionString = `\
function(transactions){
  log(transactions[0].name);
  transactions[0].name = 'Changed!';
}\
`;
          runner.hooks.beforeAll(functionString);

          transactions = [{
            name: 'Test!',
            request: {headers: {}, body: ''},
            skip: true
          }
          ];

          return runner.executeAllTransactions(transactions, runner.hooks, function(err) {
            const call = configuration.emitter.emit.getCall(0);
            assert.notOk(configuration.emitter.emit.calledWith("test error"));
            assert.equal(transactions[0].name, 'Changed!');
            assert.isArray(runner.logs);
            assert.lengthOf(runner.logs, 1);
            assert.propertyVal(runner.logs[0], 'content', 'Test!');
            return done(err);
          });
        });
      })
    );

    describe('*Each hooks with standard async API (first argument transactions, second callback)', function() {

      const transactionsForExecution = [];

      before(function() {
        transaction = {
          name: 'Group Machine > Machine > Delete Message > Bogus example name',
          id: 'POST /machines',
          host: '127.0.0.1',
          port: '3000',
          request: {
            body: '{\n  "type": "bulldozer",\n  "name": "willy"}\n',
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'Dredd/0.2.1 (Darwin 13.0.0; x64)',
              'Content-Length': 44
            },
            uri: '/machines',
            method: 'POST'
          },
          expected: {
            headers: { 'content-type': 'application/json'
          },
            body: '{\n  "type": "bulldozer",\n  "name": "willy",\n  "id": "5229c6e8e4b0bd7dbb07e29c"\n}\n',
            statusCode: '202'
          },
          origin: {
            resourceGroupName: 'Group Machine',
            resourceName: 'Machine',
            actionName: 'Delete Message',
            exampleName: 'Bogus example name'
          },
          fullPath: '/machines',
          protocol: 'http:'
        };

        return (() => {
          const result = [];
          for (let i of [1, 2]) {
            const clonedTransaction = clone(transaction);
            clonedTransaction['name'] = clonedTransaction['name'] + ` ${i}`;
            result.push(transactionsForExecution.push(clonedTransaction));
          }
          return result;
        })();
      });

      describe('with a ‘beforeEach’ hook', function() {
        const hook = (transactions, callback) => callback();

        const beforeEachStub = sinon.spy(hook);

        beforeEach(function() {
          runner.hooks.beforeEach(beforeEachStub);
          return server = nock('http://127.0.0.1:3000').
            post('/machines', {"type":"bulldozer", "name":"willy"}).
            reply(transactionsForExecution[0]['expected']['statusCode'],
              transactionsForExecution[0]['expected']['body'],
              {'Content-Type': 'application/json'});});

        afterEach(function() {
          beforeEachStub.reset();
          return nock.cleanAll();
        });

        it('should run the hooks', done =>
          runner.executeAllTransactions(transactionsForExecution, runner.hooks, function() {
            assert.isOk(beforeEachStub.called);
            return done();
          })
        );

        return it('should run the hook for each transaction', done =>
          runner.executeAllTransactions(transactionsForExecution, runner.hooks, function() {
            assert.equal(beforeEachStub.callCount, transactionsForExecution.length);
            return done();
          })
        );
      });

      describe('with a ‘beforeEachValidation’ hook', function() {
        const hook = function(transaction, callback) {
          transaction.real.statusCode = '403';
          return callback();
        };

        const beforeEachValidationStub = sinon.spy(hook);

        beforeEach(function() {
          runner.hooks.beforeEachValidation(beforeEachValidationStub);
          return server = nock('http://127.0.0.1:3000').
            post('/machines', {"type":"bulldozer", "name":"willy"}).
            reply(transactionsForExecution[0]['expected']['statusCode'],
              transactionsForExecution[0]['expected']['body'],
              {'Content-Type': 'application/json'});});

        afterEach(function() {
          beforeEachValidationStub.reset();
          return nock.cleanAll();
        });

        it('should run the hooks', function(done) {
          transaction = clone(transactionsForExecution[0]);
          return runner.executeAllTransactions([transaction], runner.hooks, function() {
            assert.isOk(beforeEachValidationStub.called);
            assert.equal(transaction.test.status, 'fail');
            return done();
          });
        });

        it('should run before gavel', function(done) {
          transaction = clone(transactionsForExecution[0]);
          transaction.expected.statusCode = '403';
          return runner.executeAllTransactions([transaction], runner.hooks, function() {
            assert.equal(transaction.test.status, 'pass');
            return done();
          });
        });

        return it('should run the hook for each transaction', done =>
          runner.executeAllTransactions(transactionsForExecution, runner.hooks, function() {
            assert.equal(beforeEachValidationStub.callCount, transactionsForExecution.length);
            return done();
          })
        );
      });

      describe('with a ‘afterEach’ hook', function() {
        const hook = (transactions, callback) => callback();

        const afterEachStub = sinon.spy(hook);

        beforeEach(function() {
          runner.hooks.afterEach(afterEachStub);
          return server = nock('http://127.0.0.1:3000').
            post('/machines', {"type":"bulldozer", "name":"willy"}).
            reply(transactionsForExecution[0]['expected']['statusCode'],
              transactionsForExecution[0]['expected']['body'],
              {'Content-Type': 'application/json'});});

        afterEach(function() {
          afterEachStub.reset();
          return nock.cleanAll();
        });

        it('should run the hooks', done =>
          runner.executeAllTransactions(transactionsForExecution, runner.hooks, function() {
            assert.isOk(afterEachStub.called);
            return done();
          })
        );

        return it('should run the hook for each transaction', done =>
          runner.executeAllTransactions(transactionsForExecution, runner.hooks, function() {
            assert.equal(afterEachStub.callCount, transactionsForExecution.length);
            return done();
          })
        );
      });

      return describe('with multiple hooks for the same events', function() {
        const legacyApiFunction = (transactions, callback) => callback();

        const beforeAllStub1 = sinon.spy(legacyApiFunction);
        const beforeAllStub2 = sinon.spy(legacyApiFunction);
        const afterAllStub1 = sinon.spy(legacyApiFunction);
        const afterAllStub2 = sinon.spy(legacyApiFunction);

        beforeEach(function() {
          runner.hooks.beforeAll(beforeAllStub1);
          runner.hooks.afterAll(afterAllStub1);
          runner.hooks.afterAll(afterAllStub2);
          return runner.hooks.beforeAll(beforeAllStub2);
        });

        return it('should run all the events in order', done =>
          runner.executeAllTransactions([], runner.hooks, function() {
            assert.isOk(beforeAllStub1.calledBefore(beforeAllStub2));
            assert.isOk(beforeAllStub2.called);
            assert.isOk(afterAllStub1.calledBefore(afterAllStub2));
            assert.isOk(afterAllStub2.called);
            return done();
          })
        );
      });
    });

    describe('with ‘before’ hook that throws an error', function() {
      beforeEach(function() {
        runner.hooks.beforeHooks = {
          'Group Machine > Machine > Delete Message > Bogus example name' : [
            transaction => JSON.parse('<<<>>>!@#!@#!@#4234234')
          ]
        };
        return sinon.stub(configuration.emitter, 'emit');
      });

      afterEach(() => configuration.emitter.emit.restore());

      return it('should report an error with the test', done =>
        runner.executeAllTransactions([transaction], runner.hooks, function() {
          assert.isOk(configuration.emitter.emit.calledWith("test error"));
          return done();
        })
      );
    });

    describe('with ‘after’ hook that throws an error', function() {
      beforeEach(function() {
        runner.hooks.afterHooks = {
          'Group Machine > Machine > Delete Message > Bogus example name' : [
            transaction => JSON.parse('<<<>>>!@#!@#!@#4234234')
          ]
        };
        return sinon.stub(configuration.emitter, 'emit');
      });

      afterEach(() => configuration.emitter.emit.restore());

      return it('should report an error with the test', done =>
        runner.executeAllTransactions([transaction], runner.hooks, function() {
          assert.isOk(configuration.emitter.emit.calledWith("test error"));
          return done();
        })
      );
    });

    describe('with ‘before’ hook that throws a chai expectation error', function() {
      beforeEach(function() {
        runner.hooks.beforeHooks = {
          'Group Machine > Machine > Delete Message > Bogus example name' : [
            transaction => assert.isOk(false)
          ]
        };
        return sinon.stub(configuration.emitter, 'emit');
      });

      afterEach(() => configuration.emitter.emit.restore());

      it('should not report an error', done =>
        runner.executeAllTransactions([transaction], runner.hooks, function() {
          assert.notOk(configuration.emitter.emit.calledWith("test error"));
          return done();
        })
      );

      it('should report a fail', done =>
        runner.executeAllTransactions([transaction], runner.hooks, function() {
          assert.isOk(configuration.emitter.emit.calledWith("test fail"));
          return done();
        })
      );

      it('should add fail message as a error under `general` to the results on transaction', done =>
        runner.executeAllTransactions([transaction], runner.hooks, function() {
          const messages = transaction['results']['general']['results'].map((value, index) => value['message']);
          assert.include(messages.join(), 'expected false to be truthy');
          return done();
        })
      );

      return it('should add fail message as a error under `general` to the results on test passed to the emitter', done =>
        runner.executeAllTransactions([transaction], runner.hooks, function() {
          const messages = [];
          const { callCount } = configuration.emitter.emit;
          for (let callNo = 0, end = callCount - 1, asc = 0 <= end; asc ? callNo <= end : callNo >= end; asc ? callNo++ : callNo--) {
            messages.push(configuration.emitter.emit.getCall(callNo).args[1]['results']['general']['results'].map(
              (value, index) => value['message'])
            );
          }
          assert.include(messages.join(), 'expected false to be truthy');
          return done();
        })
      );
    });

    describe('with ‘after’ hook that throws a chai expectation error', function() {
      beforeEach(function() {
        runner.hooks.afterHooks = {
          'Group Machine > Machine > Delete Message > Bogus example name' : [
            transaction => assert.isOk(false)
          ]
        };
        return sinon.stub(configuration.emitter, 'emit');
      });

      afterEach(() => configuration.emitter.emit.restore());

      it('should not report an error', done =>
        runner.executeAllTransactions([transaction], runner.hooks, function() {
          assert.notOk(configuration.emitter.emit.calledWith("test error"));
          return done();
        })
      );

      it('should report a fail', done =>
        runner.executeAllTransactions([transaction], runner.hooks, function() {
          assert.isOk(configuration.emitter.emit.calledWith("test fail"));
          return done();
        })
      );

      it('should set test as failed', done =>
        runner.executeAllTransactions([transaction], runner.hooks, function() {
          assert.equal(transaction.test.status, 'fail');
          return done();
        })
      );

      it('should add fail message as a error under `general` to the results on transaction', done =>
        runner.executeAllTransactions([transaction], runner.hooks, function() {
          const messages = transaction['results']['general']['results'].map((value, index) => value['message']);
          assert.include(messages.join(), 'expected false to be truthy');
          return done();
        })
      );

      return it('should add fail message as a error under `general` to the results on test passed to the emitter', done =>
        runner.executeAllTransactions([transaction], runner.hooks, function() {
          const messages = [];
          const { callCount } = configuration.emitter.emit;
          for (let callNo = 0, end = callCount - 1, asc = 0 <= end; asc ? callNo <= end : callNo >= end; asc ? callNo++ : callNo--) {
            messages.push(configuration.emitter.emit.getCall(callNo).args[1]['results']['general']['results'].map(
              (value, index) => value['message'])
            );
          }
          assert.include(messages.join(), 'expected false to be truthy');
          return done();
        })
      );
    });

    describe('with hook failing the transaction', function() {
      describe('in ‘before’ hook', function() {
        let clonedTransaction = null;
        beforeEach(function() {
          clonedTransaction = clone(transaction);
          runner.hooks.beforeHooks = {
            'Group Machine > Machine > Delete Message > Bogus example name' : [
              hookTransaction => hookTransaction.fail = "Message before"
            ]
          };
          return sinon.stub(configuration.emitter, 'emit');
        });

        afterEach(() => configuration.emitter.emit.restore());

        it('should fail the test', done =>
          runner.executeAllTransactions([clonedTransaction], runner.hooks, function() {
            assert.isOk(configuration.emitter.emit.calledWith("test fail"));
            return done();
          })
        );

        it('should not run the transaction', done =>
          runner.executeAllTransactions([clonedTransaction], runner.hooks, function() {
            assert.notOk(server.isDone());
            return done();
          })
        );

        it('should pass the failing message to the emitter', done =>
          runner.executeAllTransactions([clonedTransaction], runner.hooks, function() {
            const messages = [];
            const { callCount } = configuration.emitter.emit;
            for (let callNo = 0, end = callCount - 1, asc = 0 <= end; asc ? callNo <= end : callNo >= end; asc ? callNo++ : callNo--) {
              messages.push(configuration.emitter.emit.getCall(callNo).args[1].message);
            }
            assert.include(messages.join(), "Message before");
            return done();
          })
        );

        it('should mention before hook in the error message', done =>
          runner.executeAllTransactions([clonedTransaction], runner.hooks, function() {
            const messages = [];
            const { callCount } = configuration.emitter.emit;
            for (let callNo = 0, end = callCount - 1, asc = 0 <= end; asc ? callNo <= end : callNo >= end; asc ? callNo++ : callNo--) {
              messages.push(configuration.emitter.emit.getCall(callNo).args[1].message);
            }
            assert.include(messages.join(), "Failed in before hook:");
            return done();
          })
        );

        it('should add fail message as a error under `general` to the results on the transaction', done =>
          runner.executeAllTransactions([clonedTransaction], runner.hooks, function() {
            const messages = clonedTransaction['results']['general']['results'].map((value, index) => value['message']);
            assert.include(messages.join(), 'Message before');
            return done();
          })
        );

        it('should add fail message as a error under `general` to the results on test passed to the emitter', done =>
          runner.executeAllTransactions([clonedTransaction], runner.hooks, function() {
            const messages = [];
            const { callCount } = configuration.emitter.emit;
            for (let callNo = 0, end = callCount - 1, asc = 0 <= end; asc ? callNo <= end : callNo >= end; asc ? callNo++ : callNo--) {
              messages.push(configuration.emitter.emit.getCall(callNo).args[1]['results']['general']['results'].map(
                (value, index) => value['message'])
              );
            }
            assert.include(messages.join(), 'Message before');
            return done();
          })
        );

        return describe('when message is set to fail also in ‘after’ hook', function() {
          clonedTransaction = null;
          beforeEach(function() {
            clonedTransaction = clone(transaction);
            return runner.hooks.afterHooks = {
              'Group Machine > Machine > Delete Message > Bogus example name' : [
                hookTransaction => hookTransaction.fail = "Message after"
              ]
            };});

          it('should not pass the failing message to the emitter', done =>
            runner.executeAllTransactions([clonedTransaction], runner.hooks, function() {
              const messages = [];
              const { callCount } = configuration.emitter.emit;
              for (let callNo = 0, end = callCount - 1, asc = 0 <= end; asc ? callNo <= end : callNo >= end; asc ? callNo++ : callNo--) {
                messages.push(configuration.emitter.emit.getCall(callNo).args[1].message);
              }
              assert.notInclude(messages.join(), "Message after fail");
              return done();
            })
          );

          it('should not mention after hook in the error message', done =>
            runner.executeAllTransactions([clonedTransaction], runner.hooks, function() {
              const messages = [];
              const { callCount } = configuration.emitter.emit;
              for (let callNo = 0, end = callCount - 1, asc = 0 <= end; asc ? callNo <= end : callNo >= end; asc ? callNo++ : callNo--) {
                messages.push(configuration.emitter.emit.getCall(callNo).args[1].message);
              }
              assert.notInclude(messages.join(), "Failed in after hook:");
              return done();
            })
          );

          it('should not add fail message as a error under `general` to the results on the transaction', done =>
            runner.executeAllTransactions([clonedTransaction], runner.hooks, function() {
              const messages = clonedTransaction['results']['general']['results'].map((value, index) => value['message']);
              assert.notInclude(messages.join(), 'Message after fail');
              return done();
            })
          );

          return it('should not add fail message as a error under `general` to the results on test passed to the emitter', done =>
            runner.executeAllTransactions([clonedTransaction], runner.hooks, function() {
              const messages = [];
              const { callCount } = configuration.emitter.emit;
              for (let callNo = 0, end = callCount - 1, asc = 0 <= end; asc ? callNo <= end : callNo >= end; asc ? callNo++ : callNo--) {
                messages.push(configuration.emitter.emit.getCall(callNo).args[1]['results']['general']['results'].map(
                  (value, index) => value['message'])
                );
              }
              assert.notInclude(messages.join(), 'Message after fail');
              return done();
            })
          );
        });
      });

      describe('in ‘after’ hook when transaction fails ', function() {
        let modifiedTransaction = {};
        beforeEach(function() {
          modifiedTransaction = clone(transaction);
          modifiedTransaction['expected']['statusCode'] = "303";

          runner.hooks.afterHooks = {
            'Group Machine > Machine > Delete Message > Bogus example name' : [
              hookTransaction => hookTransaction.fail = "Message after fail"
            ]
          };
          return sinon.stub(configuration.emitter, 'emit');
        });

        afterEach(function() {
          configuration.emitter.emit.reset();
          return configuration.emitter.emit.restore();
        });

        it('should make the request', done =>
          runner.executeAllTransactions([modifiedTransaction], runner.hooks, function() {
            assert.isOk(server.isDone());
            return done();
          })
        );

        it('should not fail again', done =>
          runner.executeAllTransactions([modifiedTransaction], runner.hooks, function() {
            let failCount = 0;
            const messages = [];
            const { callCount } = configuration.emitter.emit;
            for (let callNo = 0, end = callCount - 1, asc = 0 <= end; asc ? callNo <= end : callNo >= end; asc ? callNo++ : callNo--) {
              if (configuration.emitter.emit.getCall(callNo).args[0] === 'test fail') { failCount++; }
              messages.push(configuration.emitter.emit.getCall(callNo).args[1].message);
            }
            assert.equal(failCount, 1);
            return done();
          })
        );

        it('should not pass the hook message to the emitter', done =>
          runner.executeAllTransactions([modifiedTransaction], runner.hooks, function() {
            const messages = [];
            const { callCount } = configuration.emitter.emit;
            for (let callNo = 0, end = callCount - 1, asc = 0 <= end; asc ? callNo <= end : callNo >= end; asc ? callNo++ : callNo--) {
              messages.push(configuration.emitter.emit.getCall(callNo).args[1].message);
            }
            assert.notInclude(messages, "Message after fail");
            return done();
          })
        );

        it('should not mention after hook in the error message', done =>
          runner.executeAllTransactions([modifiedTransaction], runner.hooks, function() {
            const messages = [];
            const { callCount } = configuration.emitter.emit;
            for (let callNo = 0, end = callCount - 1, asc = 0 <= end; asc ? callNo <= end : callNo >= end; asc ? callNo++ : callNo--) {
              messages.push(configuration.emitter.emit.getCall(callNo).args[1].message);
            }
            assert.notInclude(messages, "Failed in after hook:");
            return done();
          })
        );

        it('should not add fail message as a error under `general` to the results on the transaction', done =>
          runner.executeAllTransactions([modifiedTransaction], runner.hooks, function() {
            const messages = modifiedTransaction['results']['general']['results'].map((value, index) => value['message']);
            assert.notInclude(messages.join(), 'Message after fail');
            return done();
          })
        );

        return it('should not add fail message as a error under `general` to the results on test passed to the emitter', done =>
          runner.executeAllTransactions([modifiedTransaction], runner.hooks, function() {
            const messages = [];
            const { callCount } = configuration.emitter.emit;
            for (let callNo = 0, end = callCount - 1, asc = 0 <= end; asc ? callNo <= end : callNo >= end; asc ? callNo++ : callNo--) {
              messages.push(configuration.emitter.emit.getCall(callNo).args[1]['results']['general']['results'].map(
                (value, index) => value['message'])
              );
            }
            assert.notInclude(messages.join(), 'Message after fail');
            return done();
          })
        );
      });

      return describe('in ‘after’ hook when transaction passes ', function() {
        let clonedTransaction = null;
        beforeEach(function() {
          clonedTransaction = clone(transaction);
          runner.hooks.afterHooks = {
            'Group Machine > Machine > Delete Message > Bogus example name' : [
              hookTransaction => hookTransaction.fail = "Message after pass"
            ]
          };
          return sinon.stub(configuration.emitter, 'emit');
        });

        afterEach(function() {
          configuration.emitter.emit.reset();
          return configuration.emitter.emit.restore();
        });

        it('should make the request', done =>
          runner.executeAllTransactions([clonedTransaction], runner.hooks, function() {
            assert.isOk(server.isDone());
            return done();
          })
        );

        it('it should fail the test', done =>
          runner.executeAllTransactions([clonedTransaction], runner.hooks, function() {
            assert.isOk(configuration.emitter.emit.calledWith("test fail"));
            return done();
          })
        );

        it('it should not pass the test', done =>
          runner.executeAllTransactions([clonedTransaction], runner.hooks, function() {
            assert.notOk(configuration.emitter.emit.calledWith("test pass"));
            return done();
          })
        );

        it('it should pass the failing message to the emitter', done =>
          runner.executeAllTransactions([clonedTransaction], runner.hooks, function() {
            const messages = [];
            const { callCount } = configuration.emitter.emit;
            for (let callNo = 0, end = callCount - 1, asc = 0 <= end; asc ? callNo <= end : callNo >= end; asc ? callNo++ : callNo--) {
              messages.push(configuration.emitter.emit.getCall(callNo).args[1].message);
            }
            assert.include(messages.join(), "Message after pass");
            return done();
          })
        );

        it('should mention after hook in the error message', done =>
          runner.executeAllTransactions([clonedTransaction], runner.hooks, function() {
            const messages = [];
            const { callCount } = configuration.emitter.emit;
            for (let callNo = 0, end = callCount - 1, asc = 0 <= end; asc ? callNo <= end : callNo >= end; asc ? callNo++ : callNo--) {
              messages.push(configuration.emitter.emit.getCall(callNo).args[1].message);
            }
            assert.include(messages.join(), "Failed in after hook:");
            return done();
          })
        );

        it('should set transaction test status to failed', done =>
          runner.executeAllTransactions([clonedTransaction], runner.hooks, function() {
            assert.equal(clonedTransaction.test.status, 'fail');
            return done();
          })
        );

        it('should add fail message as a error under `general` to the results', done =>
          runner.executeAllTransactions([clonedTransaction], runner.hooks, function() {
            const messages = clonedTransaction['results']['general']['results'].map((value, index) => value['message']);
            assert.include(messages.join(), 'Message after pass');
            return done();
          })
        );

        return it('should not add fail message as a error under `general` to the results on test passed to the emitter', done =>
          runner.executeAllTransactions([clonedTransaction], runner.hooks, function() {
            const messages = [];
            const { callCount } = configuration.emitter.emit;
            for (let callNo = 0, end = callCount - 1, asc = 0 <= end; asc ? callNo <= end : callNo >= end; asc ? callNo++ : callNo--) {
              messages.push(configuration.emitter.emit.getCall(callNo).args[1]['results']['general']['results'].map(
                (value, index) => value['message'])
              );
            }
            assert.include(messages.join(), 'Message after pass');
            return done();
          })
        );
      });
    });

    describe('without hooks', function() {
      beforeEach(() => sinon.stub(configuration.emitter, 'emit'));

      afterEach(function() {
        configuration.emitter.emit.reset();
        return configuration.emitter.emit.restore();
      });

      it('should not run the hooks', done =>
        runner.executeAllTransactions([transaction], runner.hooks, () => done())
      );

      return it('should pass the transactions', done =>
        runner.executeAllTransactions([transaction], runner.hooks, function(error) {
          if (error) { done(error); }
          assert.isOk(configuration.emitter.emit.calledWith("test pass"));
          return done();
        })
      );
    });

    return describe('with hook modifying the transaction body and backend Express app using the body parser', function() {
      before(() => nock.enableNetConnect());

      after(() => nock.disableNetConnect());

      return it('should perform the transaction and don\'t hang', function(done) {
        nock.cleanAll();

        const receivedRequests = [];

        runner.hooks.beforeHooks = {
          'Group Machine > Machine > Delete Message > Bogus example name' : [
            function(transaction) {
              const body = JSON.parse(transaction.request.body);
              body.name = "Michael";
              transaction.request.body = JSON.stringify(body);
              return transaction.request.headers['Content-Length'] = transaction.request.body.length;
            }
          ]
        };

        const app = express();
        app.use(bodyParser.json());

        app.post('/machines', function(req, res) {
          receivedRequests.push(req);
          return res.json([{type: 'bulldozer', name: 'willy'}]);
      });

        server = app.listen(transaction.port, () =>
          runner.executeAllTransactions([transaction], runner.hooks, function() {
            //should not hang here
            assert.isOk(true);
            return server.close();
          })
        );

        return server.on('close', function() {
          assert.equal(receivedRequests.length, 1);
          return done();
        });
      });
    });
  });

  describe('runHooksForData(hooks, data, legacy = true, callback)', () =>
    describe('when legacy is false', () =>
      describe('and an exception in hook appears', function() {
        before(function() {
          configuration =
            {emitter: new EventEmitter()};

          runner = new Runner(configuration);

          return sinon.stub(configuration.emitter, 'emit');
        });

        after(() => configuration.emitter.emit.restore());

        return it('should be called with warning containing error message', function(done) {
          const hook = `\
function(transcaction){
  throw(new Error("Throwed message"))
}\
`;

          return runner.runHooksForData([hook], {}, false, function() {
            assert.isOk(configuration.emitter.emit.calledWith("test error"));
            const messages = [];
            const { callCount } = configuration.emitter.emit;
            for (let callNo = 0, end = callCount - 1, asc = 0 <= end; asc ? callNo <= end : callNo >= end; asc ? callNo++ : callNo--) {
              messages.push(configuration.emitter.emit.getCall(callNo).args[1].message);
            }
            return done();
          });
        });
      })
    )
  );

  return describe('runHook(hook, transaction, callback)', () =>
    describe('when sandbox mode is on (hook function is a string)', function() {

      before(function() {
        configuration = {};
        return runner = new Runner(configuration);
      });

      it('should execute the code of hook', function(done) {
        const hook = `\
function(transaction){
  throw(new Error('Exploded inside a sandboxed hook'));
}\
`;
        return runner.runHook(hook, {}, function(err) {
          assert.include(err, 'sandbox');
          return done();
        });
      });

      it('should not have aceess to current context', function(done) {
        const contextVar = "this";
        const hook = `\
function(transaction){
  contextVar = "that";
}\
`;
        return runner.runHook(hook, {}, function() {
          assert.equal(contextVar, 'this');
          return done();
        });
      });

      it('should not have access to require', function(done) {
        const hook = `\
function(transaction){
  require('fs');
}\
`;
        return runner.runHook(hook, {}, function(err) {
          assert.include(err, 'require');
          return done();
        });
      });

      it('should have access to the hook stash', function(done) {
        const hook = `\
function(transaction){
  stash['prop'] = 'that';
}\
`;
        return runner.runHook(hook, {}, function(err) {
          if (err) { return done(new Error(err)); }
          assert.isUndefined(err);
          return done();
        });
      });

      it('should be able to modify hook stash', function(done) {
        const hook = `\
function(transaction){
  stash['prop'] = 'that';
}\
`;
        return runner.runHook(hook, {}, function(err) {
          if (err) { return done(new Error(err)); }
          assert.property(runner.hookStash, 'prop');
          return done();
        });
      });


      it('should be able to modify hook stash multiple times', function(done) {
        let hook = `\
function(transaction){
  stash['prop'] = 'that';
}\
`;
        return runner.runHook(hook, {}, function(err) {
          if (err) { return done(new Error(err)); }
          assert.property(runner.hookStash, 'prop');

          hook = `\
function(transaction){
  stash['prop2'] = 'that';
}\
`;
          return runner.runHook(hook, {}, function(err) {
            if (err) { return done(new Error(err)); }
            assert.property(runner.hookStash, 'prop');
            assert.property(runner.hookStash, 'prop2');

            return done();
          });
        });
      });

      it('should be able to modify the transaction', function(done) {
        const hook = `\
function(transaction){
  transaction['prop'] = 'that';
}\
`;
        transaction = {'some': 'mess'};
        return runner.runHook(hook, transaction, function(err) {
          if (err) { return done(new Error(err)); }
          assert.property(transaction, 'prop');
          return done();
        });
      });

      it('should have access to log', function(done) {
        const hook = `\
function(transaction){
  log('log test');
}\
`;
        return runner.runHook(hook, {}, function(err) {
          if (err) { return done(new Error(err)); }
          return done();
        });
      });

      return it('should NOT have access to console', function(done) {
        const hook = `\
function(transaction){
  console.log('console test');
}\
`;
        return runner.runHook(hook, {}, function(err) {
          assert.isDefined(err);
          assert.include(err, 'Cannot read property \'log\' of undefined');
          return done();
        });
      });
    })
  );
});
