import bodyParser from 'body-parser';
import clone from 'clone';
import express from 'express';
import htmlStub from 'html';
import nock from 'nock';
import sinon from 'sinon';
import proxyquire from 'proxyquire';
import { assert } from 'chai';
import { EventEmitter } from 'events';
import addHooks from '../../lib/addHooks';
import loggerStub from '../../lib/logger';
import Hooks from '../../lib/Hooks';

nock.enableNetConnect();

const Runner = proxyquire('../../lib/TransactionRunner', {
  html: htmlStub,
  './logger': loggerStub,
}).default;

describe('TransactionRunner', () => {
  let server;
  let configuration = {
    endpoint: 'http://127.0.0.1:3000',
    emitter: new EventEmitter(),
    custom: {
      cwd: process.cwd(),
    },
    'dry-run': false,
    method: [],
    only: [],
    header: [],
    reporter: [],
  };

  let transaction;
  let runner;

  before(() => {
    loggerStub.transports.console.silent = true;
    nock.disableNetConnect();
  });

  after(() => {
    loggerStub.transports.console.silent = false;
    nock.enableNetConnect();
  });

  describe('constructor', () => {
    beforeEach(() => {
      runner = new Runner(configuration);
    });

    it('should copy configuration', () =>
      assert.isOk(runner.configuration.endpoint));

    it('should have an empty hookStash object', () =>
      assert.deepEqual(runner.hookStash, {}));

    it('should have an empty array of logs object', () =>
      assert.deepEqual(runner.logs, []));
  });

  describe('config(config)', () => {
    describe('when single file in apiDescriptions is present', () =>
      it('should set multiBlueprint to false', () => {
        configuration = {
          endpoint: 'http://127.0.0.1:3000',
          emitter: new EventEmitter(),
          apiDescriptions: [{ location: 'filename.api', content: '...' }],
          custom: { cwd: process.cwd() },
          'dry-run': false,
          method: [],
          only: [],
          header: [],
          reporter: [],
        };

        runner = new Runner(configuration);
        runner.config(configuration);

        assert.notOk(runner.multiBlueprint);
      }));

    describe('when multiple files in apiDescriptions are present', () =>
      it('should set multiBlueprint to true', () => {
        configuration = {
          endpoint: 'http://127.0.0.1:3000',
          emitter: new EventEmitter(),
          apiDescriptions: [
            { location: 'filename1.api', content: '...' },
            { location: 'filename2.api', content: '...' },
          ],
          custom: { cwd: process.cwd() },
          'dry-run': false,
          method: [],
          only: [],
          header: [],
          reporter: [],
        };
        runner = new Runner(configuration);
        runner.config(configuration);

        assert.isOk(runner.multiBlueprint);
      }));
  });

  describe('configureTransaction(transaction)', () => {
    beforeEach(() => {
      transaction = {
        name:
          'Machines API > Group Machine > Machine > Delete Message > Bogus example name',
        request: {
          body: '{\n  "type": "bulldozer",\n  "name": "willy"}\n',
          headers: {
            'Content-Type': {
              value: 'application/json',
            },
          },
          uri: '/machines',
          method: 'POST',
        },
        response: {
          body:
            '{\n  "type": "bulldozer",\n  "name": "willy",\n  "id": "5229c6e8e4b0bd7dbb07e29c"\n}\n',
          headers: {
            'content-type': {
              value: 'application/json',
            },
          },
          status: '202',
        },
        origin: {
          apiName: 'Machines API',
          resourceGroupName: 'Group Machine',
          resourceName: 'Machine',
          actionName: 'Delete Message',
          exampleName: 'Bogus example name',
        },
        apiDescriptionMediaType: 'text/vnd.apiblueprint',
      };

      runner = new Runner(configuration);
    });

    describe('when server address', () => {
      const filename = 'api-description.apib';
      let configuredTransaction;

      [
        {
          description: 'is hostname',
          input: { serverUrl: 'https://127.0.0.1:8000', requestPath: '/hello' },
          expected: {
            host: '127.0.0.1',
            port: '8000',
            protocol: 'https:',
            fullPath: '/hello',
          },
        },
        {
          description: 'is IPv4',
          input: { serverUrl: 'https://127.0.0.1:8000', requestPath: '/hello' },
          expected: {
            host: '127.0.0.1',
            port: '8000',
            protocol: 'https:',
            fullPath: '/hello',
          },
        },
        {
          description: 'has path',
          input: {
            serverUrl: 'http://127.0.0.1:8000/v1',
            requestPath: '/hello',
          },
          expected: {
            host: '127.0.0.1',
            port: '8000',
            protocol: 'http:',
            fullPath: '/v1/hello',
          },
        },
        {
          description: 'has path with trailing slash',
          input: {
            serverUrl: 'http://127.0.0.1:8000/v1/',
            requestPath: '/hello',
          },
          expected: {
            host: '127.0.0.1',
            port: '8000',
            protocol: 'http:',
            fullPath: '/v1/hello',
          },
        },
        {
          description: 'has path and request path is /',
          input: { serverUrl: 'http://127.0.0.1:8000/v1', requestPath: '/' },
          expected: {
            host: '127.0.0.1',
            port: '8000',
            protocol: 'http:',
            fullPath: '/v1/',
          },
        },
        {
          description: 'has path with trailing slash and request path is /',
          input: { serverUrl: 'http://127.0.0.1:8000/v1/', requestPath: '/' },
          expected: {
            host: '127.0.0.1',
            port: '8000',
            protocol: 'http:',
            fullPath: '/v1/',
          },
        },
        {
          description: 'has path and request has no path',
          input: { serverUrl: 'http://127.0.0.1:8000/v1', requestPath: '' },
          expected: {
            host: '127.0.0.1',
            port: '8000',
            protocol: 'http:',
            fullPath: '/v1',
          },
        },
        {
          description: 'has path with trailing slash and request has no path',
          input: { serverUrl: 'http://127.0.0.1:8000/v1/', requestPath: '' },
          expected: {
            host: '127.0.0.1',
            port: '8000',
            protocol: 'http:',
            fullPath: '/v1/',
          },
        },
        {
          description: 'is hostname with no protocol',
          input: { serverUrl: '127.0.0.1', requestPath: '/hello' },
          expected: {
            host: '127.0.0.1',
            port: null,
            protocol: 'http:',
            fullPath: '/hello',
          },
        },
        {
          description: 'is IPv4 with no protocol',
          input: { serverUrl: '127.0.0.1:4000', requestPath: '/hello' },
          expected: {
            host: '127.0.0.1',
            port: '4000',
            protocol: 'http:',
            fullPath: '/hello',
          },
        },
        {
          description: 'is hostname with // instead of protocol',
          input: { serverUrl: '//127.0.0.1', requestPath: '/hello' },
          expected: {
            host: '127.0.0.1',
            port: null,
            protocol: 'http:',
            fullPath: '/hello',
          },
        },
        {
          description: 'is hostname with trailing slash',
          input: { serverUrl: 'http://127.0.0.1/', requestPath: '/hello' },
          expected: {
            host: '127.0.0.1',
            port: null,
            protocol: 'http:',
            fullPath: '/hello',
          },
        },
        {
          description: 'is hostname with no protocol and with trailing slash',
          input: { serverUrl: '127.0.0.1/', requestPath: '/hello' },
          expected: {
            host: '127.0.0.1',
            port: null,
            protocol: 'http:',
            fullPath: '/hello',
          },
        },
      ].forEach(({ description, input, expected }) =>
        context(
          `${description}: '${input.serverUrl}' + '${input.requestPath}'`,
          () => {
            beforeEach(() => {
              runner.configuration.endpoint = input.serverUrl;
              transaction.request.uri = input.requestPath;
              transaction.origin.filename = filename;
              transaction.apiDescription = {
                mediaType: 'text/vnd.apiblueprint',
              };
              configuredTransaction = runner.configureTransaction(transaction);
            });

            it(`the transaction gets configured with fullPath '${expected.fullPath}' and has expected host, port, and protocol`, () =>
              assert.deepEqual(
                {
                  host: configuredTransaction.host,
                  port: configuredTransaction.port,
                  protocol: configuredTransaction.protocol,
                  fullPath: configuredTransaction.fullPath,
                },
                expected,
              ));
          },
        ),
      );
    });

    describe('when processing OpenAPI 2 document and given transaction has non-2xx status code', () => {
      const filename = 'api-description.yml';
      let configuredTransaction;

      ['100', '400', 199, 300].forEach((status) =>
        context(`status code: ${JSON.stringify(status)}`, () => {
          beforeEach(() => {
            transaction.response.status = status;
            transaction.origin.filename = filename;
            transaction.apiDescription = {
              mediaType: 'application/swagger+json',
            };
            configuredTransaction = runner.configureTransaction(transaction);
          });

          it('skips the transaction by default', () =>
            assert.isTrue(configuredTransaction.skip));
        }),
      );
    });

    describe('when processing OpenAPI 2 document and given transaction has 2xx status code', () => {
      const filename = 'api-description.yml';
      let configuredTransaction;

      ['200', 299].forEach((status) =>
        context(`status code: ${JSON.stringify(status)}`, () => {
          beforeEach(() => {
            transaction.response.status = status;
            transaction.origin.filename = filename;
            transaction.apiDescription = {
              mediaType: 'application/swagger+json',
            };
            configuredTransaction = runner.configureTransaction(transaction);
          });

          it('does not skip the transaction by default', () =>
            assert.isFalse(configuredTransaction.skip));
        }),
      );
    });

    describe('when processing other than OpenAPI 2 document and given transaction has non-2xx status code', () => {
      const filename = 'api-description.yml';
      let configuredTransaction;

      beforeEach(() => {
        transaction.response.status = 400;
        transaction.origin.filename = filename;
        transaction.apiDescription = { mediaType: 'text/plain' };
        configuredTransaction = runner.configureTransaction(transaction);
      });

      it('does not skip the transaction by default', () =>
        assert.isFalse(configuredTransaction.skip));
    });

    describe('when processing multiple API description documents', () =>
      it('should include api name in the transaction name', () => {
        runner.multiBlueprint = true;
        const configuredTransaction = runner.configureTransaction(transaction);
        assert.include(configuredTransaction.name, 'Machines API');
      }));

    describe('when processing only single API description document', () =>
      it('should not include api name in the transaction name', () => {
        runner.multiBlueprint = false;
        const configuredTransaction = runner.configureTransaction(transaction);
        assert.notInclude(configuredTransaction.name, 'Machines API');
      }));

    describe('when request does not have User-Agent', () =>
      it('should add the Dredd User-Agent', () => {
        const configuredTransaction = runner.configureTransaction(transaction);
        assert.isOk(configuredTransaction.request.headers['User-Agent']);
      }));

    describe('when an additional header has a colon', () => {
      beforeEach(() => {
        const conf = clone(configuration);
        conf.header = ['MyCustomDate:Wed, 10 Sep 2014 12:34:26 GMT'];
        runner = new Runner(conf);
      });

      it('should include the entire value in the header', () => {
        const configuredTransaction = runner.configureTransaction(transaction);
        assert.equal(
          configuredTransaction.request.headers.MyCustomDate,
          'Wed, 10 Sep 2014 12:34:26 GMT',
        );
      });
    });

    describe('when configuring a transaction', () =>
      it('should callback with a properly configured transaction', () => {
        const configuredTransaction = runner.configureTransaction(transaction);
        assert.equal(
          configuredTransaction.name,
          'Group Machine > Machine > Delete Message > Bogus example name',
        );
        assert.equal(configuredTransaction.id, 'POST (202) /machines');
        assert.isOk(configuredTransaction.host);
        assert.isOk(configuredTransaction.request);
        assert.isOk(configuredTransaction.expected);
        assert.strictEqual(transaction.origin, configuredTransaction.origin);
      }));

    describe('when endpoint URL contains PORT and path', () => {
      beforeEach(() => {
        const configurationWithPath = clone(configuration);
        configurationWithPath.endpoint =
          'https://hostname.tld:9876/my/path/to/api/';
        runner = new Runner(configurationWithPath);
      });

      it('should join the endpoint path with transaction uriTemplate together', () => {
        const configuredTransaction = runner.configureTransaction(transaction);
        assert.equal(configuredTransaction.id, 'POST (202) /machines');
        assert.strictEqual(configuredTransaction.host, 'hostname.tld');
        assert.equal(configuredTransaction.port, 9876);
        assert.strictEqual(configuredTransaction.protocol, 'https:');
        assert.strictEqual(
          configuredTransaction.fullPath,
          '/my/path/to/api/machines',
        );
      });

      it('should keep trailing slash in url if present', () => {
        transaction.request.uri = '/machines/';
        const configuredTransaction = runner.configureTransaction(transaction);
        assert.equal(configuredTransaction.id, 'POST (202) /machines/');
        assert.strictEqual(
          configuredTransaction.fullPath,
          '/my/path/to/api/machines/',
        );
      });
    });
  });

  describe('executeTransaction(transaction, callback)', () => {
    beforeEach(() => {
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
            'Content-Length': 44,
          },
          uri: '/machines',
          method: 'POST',
        },
        expected: {
          headers: { 'content-type': 'application/json' },
          body:
            '{\n  "type": "bulldozer",\n  "name": "willy",\n  "id": "5229c6e8e4b0bd7dbb07e29c"\n}\n',
          status: '202',
        },
        origin: {
          resourceGroupName: 'Group Machine',
          resourceName: 'Machine',
          actionName: 'Delete Message',
          exampleName: 'Bogus example name',
        },
        fullPath: '/machines',
        protocol: 'http:',
      };
    });

    describe('when printing the names', () => {
      beforeEach(() => {
        sinon.spy(loggerStub, 'debug');
        configuration.names = true;
        runner = new Runner(configuration);
      });

      afterEach(() => {
        loggerStub.debug.restore();
        configuration.names = false;
      });

      it('should print the names and return', (done) =>
        runner.executeTransaction(transaction, () => {
          assert.isOk(loggerStub.debug.called);
          done();
        }));
    });

    describe('when a dry run', () => {
      beforeEach(() => {
        configuration['dry-run'] = true;
        runner = new Runner(configuration);
        sinon.spy(runner, 'performRequestAndValidate');
      });

      afterEach(() => {
        configuration['dry-run'] = false;
        runner.performRequestAndValidate.restore();
      });

      it('should skip the tests', (done) =>
        runner.executeTransaction(transaction, () => {
          assert.isOk(runner.performRequestAndValidate.notCalled);
          done();
        }));
    });

    describe('when only certain methods are allowed by the configuration', () => {
      beforeEach(() => {
        configuration.method = ['GET'];
        runner = new Runner(configuration);
        sinon.spy(runner, 'skipTransaction');
      });

      afterEach(() => {
        configuration.method = [];
        runner.skipTransaction.restore();
      });

      it('should only perform those requests', (done) =>
        runner.executeTransaction(transaction, () => {
          assert.isOk(runner.skipTransaction.called);
          done();
        }));
    });

    describe('when only certain names are allowed by the configuration', () => {
      beforeEach(() => {
        server = nock('http://127.0.0.1:3000')
          .post('/machines', { type: 'bulldozer', name: 'willy' })
          .reply(transaction.expected.status, transaction.expected.body, {
            'Content-Type': 'application/json',
          });

        configuration.only = [
          'Group Machine > Machine > Delete Message > Bogus example name',
        ];
        runner = new Runner(configuration);
        sinon.spy(runner, 'skipTransaction');
      });

      afterEach(() => {
        runner.skipTransaction.restore();
        configuration.only = [];
        nock.cleanAll();
      });

      it('should not skip transactions with matching names', (done) =>
        runner.executeTransaction(transaction, () => {
          assert.notOk(runner.skipTransaction.called);
          done();
        }));

      it('should skip transactions with different names', (done) => {
        transaction.name =
          'Group Machine > Machine > Delete Message > Bogus different example name';
        runner.executeTransaction(transaction, () => {
          assert.isOk(runner.skipTransaction.called);
          done();
        });
      });
    });

    describe('when a test has been manually set to skip in a hook', () => {
      let clonedTransaction;

      beforeEach((done) => {
        sinon.stub(configuration.emitter, 'emit');

        clonedTransaction = clone(transaction);

        runner = new Runner(configuration);

        addHooks(runner, [clonedTransaction], (err) => {
          if (err) {
            return done(err);
          }

          runner.hooks.beforeHooks = {
            'Group Machine > Machine > Delete Message > Bogus example name': [
              (hookTransaction) => {
                hookTransaction.skip = true;
              },
            ],
          };
          done();
        });
      });

      afterEach(() => configuration.emitter.emit.restore());

      // If you happen to wonder why some of the callbacks in following tests
      // get executed twice, see try/catch in runHooksForData() in TransactionRunner.js

      it('should skip the test', (done) =>
        runner.executeAllTransactions(
          [clonedTransaction],
          runner.hooks,
          (err) => {
            assert.isOk(configuration.emitter.emit.calledWith('test skip'));
            done(err);
          },
        ));

      it('should add skip message as a warning under `errors` to the results on transaction', (done) =>
        runner.executeAllTransactions(
          [clonedTransaction],
          runner.hooks,
          (err) => {
            const messages = clonedTransaction.errors.map(
              (value) => value.message,
            );
            assert.include(messages.join().toLowerCase(), 'skipped');
            done(err);
          },
        ));

      it('should add fail message as a warning under `errors` to the results on test passed to the emitter', (done) =>
        runner.executeAllTransactions(
          [clonedTransaction],
          runner.hooks,
          (err) => {
            const messages = [];
            const { callCount } = configuration.emitter.emit;
            for (
              let callNo = 0, end = callCount - 1, asc = end >= 0;
              asc ? callNo <= end : callNo >= end;
              asc ? callNo++ : callNo--
            ) {
              messages.push(
                configuration.emitter.emit
                  .getCall(callNo)
                  .args[1].errors.map((value) => value.message),
              );
            }
            assert.include(messages.join().toLowerCase(), 'skipped');
            done(err);
          },
        ));

      it('should set status `skip` on test passed to the emitter', (done) =>
        runner.executeAllTransactions(
          [clonedTransaction],
          runner.hooks,
          (err) => {
            const tests = [];
            Object.keys(configuration.emitter.emit.args).forEach((value) => {
              const args = configuration.emitter.emit.args[value];
              if (args[0] === 'test skip') {
                tests.push(args[1]);
              }
            });

            assert.equal(tests.length, 1);
            assert.equal(tests[0].status, 'skip');
            done(err);
          },
        ));

      it('should set transaction info on the skipped test', (done) =>
        runner.executeAllTransactions([clonedTransaction], runner.hooks, () => {
          assert.propertyVal(
            clonedTransaction.test,
            'request',
            clonedTransaction.request,
          );
          assert.propertyVal(
            clonedTransaction.test,
            'expected',
            clonedTransaction.expected,
          );
          assert.propertyVal(
            clonedTransaction.test,
            'actual',
            clonedTransaction.real,
          );
          done();
        }));
    });

    describe('when server uses https', () => {
      beforeEach(() => {
        server = nock('https://127.0.0.1:3000')
          .post('/machines', { type: 'bulldozer', name: 'willy' })
          .reply(transaction.expected.status, transaction.expected.body, {
            'Content-Type': 'application/json',
          });
        configuration.endpoint = 'https://127.0.0.1:3000';
        transaction.protocol = 'https:';
        runner = new Runner(configuration);
      });

      afterEach(() => nock.cleanAll());

      it('should make the request with https', (done) =>
        runner.executeTransaction(transaction, () => {
          assert.isOk(server.isDone());
          done();
        }));
    });

    describe('when server uses http', () => {
      beforeEach(() => {
        server = nock('http://127.0.0.1:3000')
          .post('/machines', { type: 'bulldozer', name: 'willy' })
          .reply(transaction.expected.status, transaction.expected.body, {
            'Content-Type': 'application/json',
          });
        configuration.endpoint = 'http://127.0.0.1:3000';
        transaction.protocol = 'http:';
        runner = new Runner(configuration);
      });

      afterEach(() => nock.cleanAll());

      it('should make the request with http', (done) =>
        runner.executeTransaction(transaction, () => {
          assert.isOk(server.isDone());
          done();
        }));
    });

    describe('when backend responds as it should', () => {
      beforeEach(() => {
        server = nock('http://127.0.0.1:3000')
          .post('/machines', { type: 'bulldozer', name: 'willy' })
          .reply(transaction.expected.status, transaction.expected.body, {
            'Content-Type': 'application/json',
          });
        runner = new Runner(configuration);
      });

      afterEach(() => nock.cleanAll());

      it('should perform the request', (done) =>
        runner.executeTransaction(transaction, () => {
          assert.isOk(server.isDone());
          done();
        }));

      it('should not return an error', (done) =>
        runner.executeTransaction(transaction, (error) => {
          assert.notOk(error);
          done();
        }));
    });

    describe('when backend responds with invalid response', () => {
      beforeEach(() => {
        server = nock('http://127.0.0.1:3000')
          .post('/machines', { type: 'bulldozer', name: 'willy' })
          .reply(400, 'Foo bar', { 'Content-Type': 'text/plain' });
        runner = new Runner(configuration);
      });

      afterEach(() => nock.cleanAll());

      it('should perform the request', (done) =>
        runner.executeTransaction(transaction, () => {
          assert.isOk(server.isDone());
          done();
        }));
    });

    describe('when backend responds a GET request with a redirection', () => {
      beforeEach(() => {
        transaction.request.method = 'GET';
        transaction.request.uri = '/machines/latest';
        transaction.fullPath = '/machines/latest';
        server = nock('http://127.0.0.1:3000')
          .get('/machines/latest')
          .reply(303, '', { Location: '/machines/123' })
          .get('/machines/123')
          .reply(transaction.expected.status, transaction.expected.body, {
            'Content-Type': 'application/json',
          });
        runner = new Runner(configuration);
      });

      afterEach(() => nock.cleanAll());

      it('should not follow the redirect', (done) =>
        runner.executeTransaction(transaction, () => {
          assert.equal(transaction.real.statusCode, 303);
          assert.notOk(server.isDone());
          done();
        }));
    });

    describe('when backend responds a POST request with a redirection', () => {
      beforeEach(() => {
        transaction.request.method = 'POST';
        server = nock('http://127.0.0.1:3000')
          .post('/machines')
          .reply(303, '', { Location: '/machines/123' })
          .get('/machines/123')
          .reply(transaction.expected.status, transaction.expected.body, {
            'Content-Type': 'application/json',
          });
        runner = new Runner(configuration);
      });

      afterEach(() => nock.cleanAll());

      it('should not follow the redirect', (done) =>
        runner.executeTransaction(transaction, () => {
          assert.equal(transaction.real.statusCode, 303);
          assert.notOk(server.isDone());
          done();
        }));
    });

    describe('when server is not running', () => {
      beforeEach(() => {
        sinon.spy(configuration.emitter, 'emit');
        runner = new Runner(configuration);
      });

      afterEach(() => configuration.emitter.emit.restore());

      it('should report a error', (done) =>
        runner.executeTransaction(transaction, () => {
          assert.isOk(configuration.emitter.emit.called);
          const events = Object.keys(configuration.emitter.emit.args).map(
            (value) => configuration.emitter.emit.args[value][0],
          );
          assert.include(events, 'test error');
          done();
        }));
    });
  });

  describe('exceuteAllTransactions(transactions, hooks, callback)', () => {
    runner = null;
    let hooks;
    let transactions;
    let serverNock1;
    let serverNock2;
    let returnedError;
    let spies;

    beforeEach(() => {
      returnedError = null;
      transactions = [];

      ['1', '2'].forEach((name) => {
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
              'Content-Length': 44,
            },
            uri: `/machines${name}`,
            method: 'POST',
          },
          expected: {
            headers: { 'content-type': 'application/json' },
            body:
              '{\n  "type": "bulldozer",\n  "name": "willy",\n  "id": "5229c6e8e4b0bd7dbb07e29c"\n}\n',
            statusCode: '202',
          },
          origin: {
            resourceGroupName: 'Group Machine',
            resourceName: 'Machine',
            actionName: 'Delete Message',
            exampleName: 'Bogus example name',
          },
          fullPath: `/machines${name}`,
          protocol: 'http:',
        });

        transactions.push(transaction);
      });

      runner = new Runner(configuration);
      hooks = new Hooks({ logs: [], logger: console });

      const spyNames = [
        'beforeAllSpy',
        'beforeEachSpy',
        'beforeEachValidationSpy',
        'beforeSpy',
        'beforeValidationSpy',
        'afterSpy',
        'afterEachSpy',
        'afterAllSpy',
      ];

      spies = {};
      spyNames.forEach((name) => {
        spies[name] = (data, hooksCallback) => hooksCallback();
        sinon
          .stub(spies, name)
          .callsFake((data, hooksCallback) => hooksCallback());
      });

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

      serverNock1 = nock('http://127.0.0.1:3000')
        .post('/machines1', { type: 'bulldozer', name: 'willy' })
        .reply(transaction.expected.statusCode, transaction.expected.body, {
          'Content-Type': 'application/json',
        });

      serverNock2 = nock('http://127.0.0.1:3000')
        .post('/machines2', { type: 'bulldozer', name: 'willy' })
        .reply(transaction.expected.statusCode, transaction.expected.body, {
          'Content-Type': 'application/json',
        });
    });

    afterEach(() => {
      nock.cleanAll();

      Object.keys(spies).forEach((name) => {
        spies[name].restore();
      });

      runner = null;
      hooks = null;
      transactions = [];
      serverNock1 = null;
      serverNock2 = null;
      returnedError = null;
      spies = {};
    });

    describe('when the hooks handler is used', () => {
      describe("and it doesn't crash", () => {
        it('should perform all transactions', (done) =>
          runner.executeAllTransactions(transactions, hooks, (error) => {
            if (error) {
              return done(error);
            }
            assert.isTrue(serverNock1.isDone(), 'first resource');
            assert.isTrue(serverNock2.isDone(), 'second resource');
            done();
          }));

        it('should execute all ‘all’ hooks once', (done) =>
          runner.executeAllTransactions(transactions, hooks, (error) => {
            if (error) {
              return done(error);
            }
            Object.keys(spies).forEach((spyName) => {
              if (spyName !== 'beforeAllSpy') {
                return;
              }
              if (spyName !== 'afterAllSpy') {
                return;
              }
              assert.isTrue(spies[spyName].called, spyName);
            });
            done();
          }));

        it('should execute all other hooks once', (done) =>
          runner.executeAllTransactions(transactions, hooks, (error) => {
            if (error) {
              return done(error);
            }
            if (error) {
              return done(error);
            }
            Object.keys(spies).forEach((spyName) => {
              if (spyName !== 'beforeAllSpy') {
                return;
              }
              if (spyName !== 'afterAllSpy') {
                return;
              }
              assert.isTrue(spies[spyName].calledTwice, spyName);
            });
            done();
          }));
      });

      describe('and it crashes (hooks handler error was set)', () => {
        describe('before any hook is executed', () => {
          beforeEach((done) => {
            runner.hookHandlerError = new Error(
              'handler died in before everything',
            );
            runner.executeAllTransactions(transactions, hooks, (error) => {
              // Setting expectation for this error below in each describe block
              returnedError = error;
              done();
            });
          });

          it('should not perform any transaction', () => {
            assert.isFalse(serverNock1.isDone(), 'first resource');
            assert.isFalse(serverNock2.isDone(), 'second resource');
          });

          it('should not perform any hooks', () => {
            Object.keys(spies || {}).forEach((spyName) => {
              assert.isFalse(spies[spyName].called, spyName);
            });
          });

          it('should return the error', () =>
            assert.include(returnedError.message, 'everything'));
        });

        describe('after ‘beforeAll’ hook is executed', () => {
          beforeEach((done) => {
            const hookHandlerError = new Error('handler died in beforeAll');

            hooks.beforeAll((data, callback) => {
              runner.hookHandlerError = hookHandlerError;
              callback();
            });

            runner.executeAllTransactions(transactions, hooks, (error) => {
              // Setting expectation for this error below in each describe block
              returnedError = error;
              done();
            });
          });

          it('should perform the ‘beforeAll’ hook', () =>
            assert.isTrue(spies.beforeAllSpy.called));

          it('should not perform any other hook', () => {
            Object.keys(spies || {}).forEach((spyName) => {
              if (spyName === 'beforeAllSpy') {
                return;
              }
              assert.isFalse(spies[spyName].called, spyName);
            });
          });

          it('should not perform any transaction', () => {
            assert.isFalse(serverNock1.isDone(), 'first resource');
            assert.isFalse(serverNock2.isDone(), 'second resource');
          });

          it('should return the error', () =>
            assert.include(returnedError.message, 'beforeAll'));
        });

        describe('after ‘beforeEach’ hook is executed', () => {
          beforeEach((done) => {
            const hookHandlerError = new Error('handler died in beforeEach');

            hooks.beforeEach((data, callback) => {
              runner.hookHandlerError = hookHandlerError;
              callback();
            });

            runner.executeAllTransactions(transactions, hooks, (error) => {
              // Setting expectation for this error below in each describe block
              returnedError = error;
              done();
            });
          });

          it('should perform the ‘beforeAll’ hook', () =>
            assert.isTrue(spies.beforeAllSpy.called));

          it('should perform the ‘beforeEach’ hook', () =>
            assert.isTrue(spies.beforeEachSpy.calledOnce));

          it('should not perform any other hook', () => {
            Object.keys(spies || {}).forEach((spyName) => {
              if (spyName === 'beforeAllSpy') {
                return;
              }
              if (spyName === 'beforeEachSpy') {
                return;
              }
              assert.isFalse(spies[spyName].called, spyName);
            });
          });

          it('should not perform any transaction', () => {
            assert.isFalse(serverNock1.isDone(), 'first resource');
            assert.isFalse(serverNock2.isDone(), 'second resource');
          });

          it('should return the error', () =>
            assert.include(returnedError.message, 'beforeEach'));
        });

        describe('after ‘before’ hook is executed', () => {
          beforeEach((done) => {
            const hookHandlerError = new Error('handler died in before 1');

            hooks.before('1', (data, callback) => {
              runner.hookHandlerError = hookHandlerError;
              callback();
            });

            runner.executeAllTransactions(transactions, hooks, (error) => {
              // Setting expectation for this error below in each describe block
              returnedError = error;
              done();
            });
          });

          it('should perform the ‘beforeAll’ hook', () =>
            assert.isTrue(spies.beforeAllSpy.called));

          it('should perform the ‘beforeEach’ hook', () =>
            assert.isTrue(spies.beforeEachSpy.calledOnce));

          it('should perform the ‘before’ hook', () =>
            assert.isTrue(spies.beforeSpy.calledOnce));

          it('should not perform any other hook', () => {
            Object.keys(spies || {}).forEach((spyName) => {
              if (spyName === 'beforeAllSpy') {
                return;
              }
              if (spyName === 'beforeEachSpy') {
                return;
              }
              if (spyName === 'beforeSpy') {
                return;
              }
              assert.isFalse(spies[spyName].called, spyName);
            });
          });

          it('should not perform any transaction', () => {
            assert.isFalse(serverNock1.isDone(), 'first resource');
            assert.isFalse(serverNock2.isDone(), 'second resource');
          });

          it('should return the error', () =>
            assert.include(returnedError.message, 'before 1'));
        });

        describe('after ‘beforeEachValidation’ hook is executed', () => {
          beforeEach((done) => {
            const hookHandlerError = new Error(
              'handler died in before each validation',
            );

            hooks.beforeEachValidation((data, callback) => {
              runner.hookHandlerError = hookHandlerError;
              callback();
            });

            runner.executeAllTransactions(transactions, hooks, (error) => {
              // Setting expectation for this error below in each describe block
              returnedError = error;
              done();
            });
          });

          it('should perform the ‘beforeAll’ hook', () =>
            assert.equal(spies.beforeAllSpy.callCount, 1));

          it('should perform the ‘beforeEach’ hook', () =>
            assert.equal(spies.beforeEachSpy.callCount, 1));

          it('should perform the ‘before’ hook', () =>
            assert.equal(spies.beforeSpy.callCount, 1));

          it('should perform the ‘beforeEachValidation’ hook', () =>
            assert.equal(spies.beforeEachValidationSpy.callCount, 1));

          it('should not perform any other hook', () => {
            Object.keys(spies || {}).forEach((spyName) => {
              if (spyName === 'beforeAllSpy') {
                return;
              }
              if (spyName === 'beforeEachSpy') {
                return;
              }
              if (spyName === 'beforeSpy') {
                return;
              }
              if (spyName === 'beforeEachValidationSpy') {
                return;
              }
              assert.isFalse(spies[spyName].called, spyName);
            });
          });

          it('should perform only the first transaction', () => {
            assert.isTrue(serverNock1.isDone(), 'first resource');
            assert.isFalse(serverNock2.isDone(), 'second resource');
          });

          it('should return the error', () =>
            assert.include(returnedError.message, 'before each validation'));
        });

        describe('after ‘beforeValidation’ hook is executed', () => {
          beforeEach((done) => {
            const hookHandlerError = new Error(
              'handler died in before validation 1',
            );

            hooks.beforeValidation('1', (data, callback) => {
              runner.hookHandlerError = hookHandlerError;
              callback();
            });

            runner.executeAllTransactions(transactions, hooks, (error) => {
              // Setting expectation for this error below in each describe block
              returnedError = error;
              done();
            });
          });

          it('should perform the ‘beforeAll’ hook', () =>
            assert.isTrue(spies.beforeAllSpy.called));

          it('should perform the ‘beforeEach’ hook', () =>
            assert.isTrue(spies.beforeEachSpy.calledOnce));

          it('should perform the ‘before’ hook', () =>
            assert.isTrue(spies.beforeSpy.calledOnce));

          it('should perform the ‘beforeEachValidation’ hook', () =>
            assert.isTrue(spies.beforeEachValidationSpy.calledOnce));

          it('should perform the ‘beforeValidation’ hook', () =>
            assert.isTrue(spies.beforeValidationSpy.calledOnce));

          it('should not perform any other hook', () => {
            Object.keys(spies || {}).forEach((spyName) => {
              if (spyName === 'beforeAllSpy') {
                return;
              }
              if (spyName === 'beforeEachSpy') {
                return;
              }
              if (spyName === 'beforeSpy') {
                return;
              }
              if (spyName === 'beforeEachValidationSpy') {
                return;
              }
              if (spyName === 'beforeValidationSpy') {
                return;
              }
              assert.isFalse(spies[spyName].called, spyName);
            });
          });

          it('should perform only first transaction', () => {
            assert.isTrue(serverNock1.isDone(), 'first resource');
            assert.isFalse(serverNock2.isDone(), 'second resource');
          });

          it('should return the error', () =>
            assert.include(returnedError.message, 'before validation 1'));
        });

        describe('after ‘after’ hook is executed', () => {
          beforeEach((done) => {
            const hookHandlerError = new Error('handler died in after 1');

            hooks.after('1', (data, callback) => {
              runner.hookHandlerError = hookHandlerError;
              callback();
            });

            runner.executeAllTransactions(transactions, hooks, (error) => {
              // Setting expectation for this error below in each describe block
              returnedError = error;
              done();
            });
          });

          it('should perform the ‘beforeAll’ hook', () =>
            assert.isTrue(spies.beforeAllSpy.called));

          it('should perform the ‘beforeEach’ hook', () =>
            assert.isTrue(spies.beforeEachSpy.calledOnce));

          it('should perform the ‘before’ hook', () =>
            assert.isTrue(spies.beforeSpy.calledOnce));

          it('should perform the ‘beforeEachValidation’ hook', () =>
            assert.isTrue(spies.beforeEachValidationSpy.calledOnce));

          it('should perform the ‘beforeValidation’ hook', () =>
            assert.isTrue(spies.beforeValidationSpy.calledOnce));

          it('should perform the ‘afterEach’ hook', () =>
            assert.isTrue(spies.afterEachSpy.calledOnce));

          it('should perform the ‘after’ hook', () =>
            assert.isTrue(spies.afterSpy.calledOnce));

          it('should not perform any other hook', () => {
            for (const spyName of Object.keys(spies || {})) {
              if (spyName === 'beforeAllSpy') {
                break;
              }
              if (spyName === 'beforeEachSpy') {
                break;
              }
              if (spyName === 'beforeSpy') {
                break;
              }
              if (spyName === 'beforeEachValidationSpy') {
                break;
              }
              if (spyName === 'beforeValidationSpy') {
                break;
              }
              if (spyName === 'after') {
                break;
              }
              assert.isFalse(spies[spyName].called, spyName);
            }
          });

          it('should not perform any other transaction', () => {
            assert.isTrue(serverNock1.isDone(), 'first resource');
            assert.isFalse(serverNock2.isDone(), 'second resource');
          });

          it('should return the error', () =>
            assert.include(returnedError.message, 'after 1'));
        });

        describe('after ‘afterEach’ hook is executed', () => {
          beforeEach((done) => {
            const hookHandlerError = new Error('handler died in after each');

            hooks.afterEach((data, callback) => {
              runner.hookHandlerError = hookHandlerError;
              callback();
            });

            runner.executeAllTransactions(transactions, hooks, (error) => {
              // Setting expectation for this error below in each describe block
              returnedError = error;
              done();
            });
          });

          it('should perform the ‘beforeAll’ hook', () =>
            assert.isTrue(spies.beforeAllSpy.called));

          it('should perform the ‘beforeEach’ hook', () =>
            assert.isTrue(spies.beforeEachSpy.calledOnce));

          it('should perform the ‘before’ hook', () =>
            assert.isTrue(spies.beforeSpy.calledOnce));

          it('should perform the ‘beforeEachValidation’ hook', () =>
            assert.isTrue(spies.beforeEachValidationSpy.calledOnce));

          it('should perform the ‘beforeValidation’ hook', () =>
            assert.isTrue(spies.beforeValidationSpy.calledOnce));

          it('should perform the ‘afterEach’ hook', () =>
            assert.isTrue(spies.afterEachSpy.calledOnce));

          it('should not perform any other hook', () => {
            for (const spyName of Object.keys(spies || {})) {
              if (spyName === 'beforeAllSpy') {
                break;
              }
              if (spyName === 'beforeEachSpy') {
                break;
              }
              if (spyName === 'beforeSpy') {
                break;
              }
              if (spyName === 'beforeEachValidationSpy') {
                break;
              }
              if (spyName === 'beforeValidationSpy') {
                break;
              }
              if (spyName === 'after') {
                break;
              }
              if (spyName === 'afterEach') {
                break;
              }
              assert.isFalse(spies[spyName].called, spyName);
            }
          });

          it('should not perform any other transaction', () => {
            assert.isTrue(serverNock1.isDone(), 'first resource');
            assert.isFalse(serverNock2.isDone(), 'second resource');
          });

          it('should return the error', () =>
            assert.include(returnedError.message, 'after each'));
        });

        describe('after ‘afterAll’ hook is executed', () => {
          beforeEach((done) => {
            const hookHandlerError = new Error('handler died in after all');

            hooks.afterAll((data, callback) => {
              runner.hookHandlerError = hookHandlerError;
              callback();
            });

            runner.executeAllTransactions(transactions, hooks, (error) => {
              // Setting expectation for this error below in each describe block
              returnedError = error;
              done();
            });
          });

          it('should perform the ‘beforeAll’ hook', () =>
            assert.isTrue(spies.beforeAllSpy.called));

          it('should perform the ‘beforeEach’ hook', () =>
            assert.isTrue(spies.beforeEachSpy.calledTwice));

          it('should perform the ‘before’ hook', () =>
            assert.isTrue(spies.beforeSpy.calledTwice));

          it('should perform the ‘beforeEachValidation’ hook', () =>
            assert.isTrue(spies.beforeEachValidationSpy.calledTwice));

          it('should perform the ‘beforeValidation’ hook', () =>
            assert.isTrue(spies.beforeValidationSpy.calledTwice));

          it('should perform the ‘afterEach’ hook', () =>
            assert.isTrue(spies.afterEachSpy.calledTwice));

          it('should perform the ‘after’ hook', () =>
            assert.isTrue(spies.afterSpy.calledTwice));

          it('should perform the ‘afterAll’ hook', () =>
            assert.isTrue(spies.afterAllSpy.calledOnce));

          it('should perform both transactions', () => {
            assert.isTrue(serverNock1.isDone(), 'first resource');
            assert.isTrue(serverNock2.isDone(), 'second resource');
          });

          it('should return the error', () =>
            assert.include(returnedError.message, 'after all'));
        });
      });
    });
  });

  describe('#executeAllTransactions', () => {
    configuration = {
      endpoint: 'http://127.0.0.1:3000',
      emitter: new EventEmitter(),
      custom: { cwd: process.cwd() },
      options: {
        'dry-run': false,
        method: [],
        header: [],
        reporter: [],
        only: [],
      },
    };
    // Do not actually search & load hookfiles from disk
    // hookfiles: './**/*_hooks.*'

    transaction = {};
    let transactions;

    beforeEach((done) => {
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
            'Content-Length': 44,
          },
          uri: '/machines',
          method: 'POST',
        },
        expected: {
          headers: { 'content-type': 'application/json' },
          body:
            '{\n  "type": "bulldozer",\n "name": "willy",\n  "id": "5229c6e8e4b0bd7dbb07e29c"\n}\n',
          statusCode: '202',
        },
        origin: {
          resourceGroupName: 'Group Machine',
          resourceName: 'Machine',
          actionName: 'Delete Message',
          exampleName: 'Bogus example name',
        },
        fullPath: '/machines',
        protocol: 'http:',
      });

      server = nock('http://127.0.0.1:3000')
        .post('/machines', { type: 'bulldozer', name: 'willy' })
        .reply(transaction.expected.statusCode, transaction.expected.body, {
          'Content-Type': 'application/json',
        });

      transactions = {};
      transactions[transaction.name] = clone(transaction, false);
      runner = new Runner(configuration);
      addHooks(runner, transactions, done);
    });

    afterEach(() => nock.cleanAll());

    describe('with hooks', () => {
      beforeEach(() => {
        sinon.spy(loggerStub, 'debug');
        runner.hooks.beforeHooks = {
          'Group Machine > Machine > Delete Message > Bogus example name': [
            // eslint-disable-next-line
            (transaction) => loggerStub.debug('before'),
          ],
        };
        runner.hooks.beforeValidationHooks = {
          'Group Machine > Machine > Delete Message > Bogus example name': [
            // eslint-disable-next-line
            (transaction) => loggerStub.debug('beforeValidation'),
          ],
        };
        runner.hooks.afterHooks = {
          'Group Machine > Machine > Delete Message > Bogus example name': [
            // eslint-disable-next-line
            function(transaction, done) {
              loggerStub.debug('after');
              done();
            },
          ],
        };
      });

      afterEach(() => loggerStub.debug.restore());

      it('should run the hooks', (done) =>
        runner.executeAllTransactions([transaction], runner.hooks, () => {
          assert.isOk(loggerStub.debug.calledWith('before'));
          assert.isOk(loggerStub.debug.calledWith('beforeValidation'));
          assert.isOk(loggerStub.debug.calledWith('after'));
          done();
        }));
    });

    describe('with hooks, but without hooks.transactions set', () => {
      beforeEach(() => {
        sinon.spy(loggerStub, 'debug');
        runner.hooks.transactions = null;
        runner.hooks.beforeHooks = {
          'Group Machine > Machine > Delete Message > Bogus example name': [
            // eslint-disable-next-line
            (transaction) => loggerStub.debug('before'),
          ],
        };
        runner.hooks.beforeValidationHooks = {
          'Group Machine > Machine > Delete Message > Bogus example name': [
            // eslint-disable-next-line
            (transaction) => loggerStub.debug('beforeValidation'),
          ],
        };
        runner.hooks.afterHooks = {
          'Group Machine > Machine > Delete Message > Bogus example name': [
            // eslint-disable-next-line
            function(transaction, done) {
              loggerStub.debug('after');
              done();
            },
          ],
        };
      });

      afterEach(() => loggerStub.debug.restore());

      it('should run the hooks', (done) => {
        runner.hooks.transactions = null;
        runner.executeAllTransactions([transaction], runner.hooks, () => {
          assert.isOk(loggerStub.debug.calledWith('before'));
          assert.isOk(loggerStub.debug.calledWith('beforeValidation'));
          assert.isOk(loggerStub.debug.calledWith('after'));
          done();
        });
      });
    });

    describe('with multiple hooks for the same transaction', () => {
      beforeEach(() => {
        sinon.spy(loggerStub, 'debug');
        runner.hooks.beforeHooks = {
          'Group Machine > Machine > Delete Message > Bogus example name': [
            // eslint-disable-next-line
            (transaction) => loggerStub.debug('first'),
            // eslint-disable-next-line
            function(transaction, cb) {
              loggerStub.debug('second');
              cb();
            },
          ],
        };
      });

      afterEach(() => loggerStub.debug.restore());

      it('should run all hooks', (done) =>
        runner.executeAllTransactions([transaction], runner.hooks, () => {
          assert.isOk(loggerStub.debug.calledWith('first'));
          assert.isOk(loggerStub.debug.calledWith('second'));
          done();
        }));
    });

    describe('‘*All’ hooks with standard async API (first argument transactions, second callback)', () => {
      describe('with a ‘beforeAll’ hook', () => {
        // eslint-disable-next-line
        const hook = (transactions, callback) => callback();

        const beforeAllStub = sinon.spy(hook);

        beforeEach(() => runner.hooks.beforeAll(beforeAllStub));

        it('should run the hooks', (done) =>
          runner.executeAllTransactions([], runner.hooks, () => {
            assert.isOk(beforeAllStub.called);
            done();
          }));
      });

      describe('with an ‘afterAll’ hook', () => {
        // eslint-disable-next-line
        const hook = (transactions, callback) => callback();

        const afterAllStub = sinon.spy(hook);

        beforeEach(() => runner.hooks.afterAll(afterAllStub));

        it('should run the hooks', (done) =>
          runner.executeAllTransactions([], runner.hooks, () => {
            assert.isOk(afterAllStub.called);
            done();
          }));
      });

      describe('with multiple hooks for the same events', () => {
        // eslint-disable-next-line
        const hook = (transactions, callback) => callback();

        const beforeAllStub1 = sinon.spy(hook);
        const beforeAllStub2 = sinon.spy(hook);
        const afterAllStub1 = sinon.spy(hook);
        const afterAllStub2 = sinon.spy(hook);

        beforeEach(() => {
          runner.hooks.beforeAll(beforeAllStub1);
          runner.hooks.afterAll(afterAllStub1);
          runner.hooks.afterAll(afterAllStub2);
          runner.hooks.beforeAll(beforeAllStub2);
        });

        it('should run all the events in order', (done) =>
          runner.executeAllTransactions([], runner.hooks, () => {
            assert.isOk(beforeAllStub1.calledBefore(beforeAllStub2));
            assert.isOk(beforeAllStub2.called);
            assert.isOk(beforeAllStub2.calledBefore(afterAllStub1));
            assert.isOk(afterAllStub1.calledBefore(afterAllStub2));
            assert.isOk(afterAllStub2.called);
            done();
          }));
      });
    });

    describe('*Each hooks with standard async API (first argument transactions, second callback)', () => {
      const transactionsForExecution = [];

      before(() => {
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
              'Content-Length': 44,
            },
            uri: '/machines',
            method: 'POST',
          },
          expected: {
            headers: { 'content-type': 'application/json' },
            body:
              '{\n  "type": "bulldozer",\n  "name": "willy",\n  "id": "5229c6e8e4b0bd7dbb07e29c"\n}\n',
            statusCode: '202',
          },
          origin: {
            resourceGroupName: 'Group Machine',
            resourceName: 'Machine',
            actionName: 'Delete Message',
            exampleName: 'Bogus example name',
          },
          fullPath: '/machines',
          protocol: 'http:',
        };

        [1, 2].forEach((i) => {
          const clonedTransaction = clone(transaction);
          clonedTransaction.name += ` ${i}`;
          transactionsForExecution.push(clonedTransaction);
        });
      });

      describe('with a ‘beforeEach’ hook', () => {
        // eslint-disable-next-line
        const hook = (transactions, callback) => callback();

        const beforeEachStub = sinon.spy(hook);

        beforeEach(() => {
          runner.hooks.beforeEach(beforeEachStub);
          server = nock('http://127.0.0.1:3000')
            .post('/machines', { type: 'bulldozer', name: 'willy' })
            .reply(
              transactionsForExecution[0].expected.statusCode,
              transactionsForExecution[0].expected.body,
              { 'Content-Type': 'application/json' },
            );
        });

        afterEach(() => {
          beforeEachStub.resetHistory();
          nock.cleanAll();
        });

        it('should run the hooks', (done) =>
          runner.executeAllTransactions(
            transactionsForExecution,
            runner.hooks,
            () => {
              assert.isOk(beforeEachStub.called);
              done();
            },
          ));

        it('should run the hook for each transaction', (done) =>
          runner.executeAllTransactions(
            transactionsForExecution,
            runner.hooks,
            () => {
              assert.equal(
                beforeEachStub.callCount,
                transactionsForExecution.length,
              );
              done();
            },
          ));
      });

      describe('with a ‘beforeEachValidation’ hook', () => {
        // eslint-disable-next-line
        const hook = function(transaction, callback) {
          transaction.real.statusCode = '403';
          callback();
        };

        const beforeEachValidationStub = sinon.spy(hook);

        beforeEach(() => {
          runner.hooks.beforeEachValidation(beforeEachValidationStub);
          server = nock('http://127.0.0.1:3000')
            .post('/machines', { type: 'bulldozer', name: 'willy' })
            .reply(
              transactionsForExecution[0].expected.statusCode,
              transactionsForExecution[0].expected.body,
              { 'Content-Type': 'application/json' },
            );
        });

        afterEach(() => {
          beforeEachValidationStub.resetHistory();
          nock.cleanAll();
        });

        it('should run the hooks', (done) => {
          transaction = clone(transactionsForExecution[0]);
          runner.executeAllTransactions([transaction], runner.hooks, () => {
            assert.isOk(beforeEachValidationStub.called);
            assert.equal(transaction.test.status, 'fail');
            done();
          });
        });

        it('should run before gavel', (done) => {
          transaction = clone(transactionsForExecution[0]);
          transaction.expected.statusCode = '403';
          runner.executeAllTransactions([transaction], runner.hooks, () => {
            assert.equal(transaction.test.status, 'pass');
            done();
          });
        });

        it('should run the hook for each transaction', (done) =>
          runner.executeAllTransactions(
            transactionsForExecution,
            runner.hooks,
            () => {
              assert.equal(
                beforeEachValidationStub.callCount,
                transactionsForExecution.length,
              );
              done();
            },
          ));
      });

      describe('with a ‘afterEach’ hook', () => {
        // eslint-disable-next-line
        const hook = (transactions, callback) => callback();

        const afterEachStub = sinon.spy(hook);

        beforeEach(() => {
          runner.hooks.afterEach(afterEachStub);
          server = nock('http://127.0.0.1:3000')
            .post('/machines', { type: 'bulldozer', name: 'willy' })
            .reply(
              transactionsForExecution[0].expected.statusCode,
              transactionsForExecution[0].expected.body,
              { 'Content-Type': 'application/json' },
            );
        });

        afterEach(() => {
          afterEachStub.resetHistory();
          nock.cleanAll();
        });

        it('should run the hooks', (done) =>
          runner.executeAllTransactions(
            transactionsForExecution,
            runner.hooks,
            () => {
              assert.isOk(afterEachStub.called);
              done();
            },
          ));

        it('should run the hook for each transaction', (done) =>
          runner.executeAllTransactions(
            transactionsForExecution,
            runner.hooks,
            () => {
              assert.equal(
                afterEachStub.callCount,
                transactionsForExecution.length,
              );
              done();
            },
          ));
      });

      describe('with multiple hooks for the same events', () => {
        // eslint-disable-next-line
        const hookFunction = (transactions, callback) => callback();

        const beforeAllStub1 = sinon.spy(hookFunction);
        const beforeAllStub2 = sinon.spy(hookFunction);
        const afterAllStub1 = sinon.spy(hookFunction);
        const afterAllStub2 = sinon.spy(hookFunction);

        beforeEach(() => {
          runner.hooks.beforeAll(beforeAllStub1);
          runner.hooks.afterAll(afterAllStub1);
          runner.hooks.afterAll(afterAllStub2);
          runner.hooks.beforeAll(beforeAllStub2);
        });

        it('should run all the events in order', (done) =>
          runner.executeAllTransactions([], runner.hooks, () => {
            assert.isOk(beforeAllStub1.calledBefore(beforeAllStub2));
            assert.isOk(beforeAllStub2.called);
            assert.isOk(afterAllStub1.calledBefore(afterAllStub2));
            assert.isOk(afterAllStub2.called);
            done();
          }));
      });
    });

    describe('with ‘before’ hook that throws an error', () => {
      beforeEach(() => {
        runner.hooks.beforeHooks = {
          'Group Machine > Machine > Delete Message > Bogus example name': [
            // eslint-disable-next-line
            (transaction) => JSON.parse('<<<>>>!@#!@#!@#4234234'),
          ],
        };
        sinon.stub(configuration.emitter, 'emit');
      });

      afterEach(() => configuration.emitter.emit.restore());

      it('should report an error with the test', (done) =>
        runner.executeAllTransactions([transaction], runner.hooks, () => {
          assert.isOk(configuration.emitter.emit.calledWith('test error'));
          done();
        }));

      it('should set transaction info on the errored test', (done) =>
        runner.executeAllTransactions([transaction], runner.hooks, () => {
          assert.propertyVal(transaction.test, 'request', transaction.request);
          assert.propertyVal(
            transaction.test,
            'expected',
            transaction.expected,
          );
          assert.propertyVal(transaction.test, 'actual', transaction.real);
          done();
        }));
    });

    describe('with ‘after’ hook that throws an error', () => {
      beforeEach(() => {
        runner.hooks.afterHooks = {
          'Group Machine > Machine > Delete Message > Bogus example name': [
            // eslint-disable-next-line
            (transaction) => JSON.parse('<<<>>>!@#!@#!@#4234234'),
          ],
        };
        sinon.stub(configuration.emitter, 'emit');
      });

      afterEach(() => configuration.emitter.emit.restore());

      it('should report an error with the test', (done) =>
        runner.executeAllTransactions([transaction], runner.hooks, () => {
          assert.isOk(configuration.emitter.emit.calledWith('test error'));
          done();
        }));

      it('should set transaction info on the errored test', (done) =>
        runner.executeAllTransactions([transaction], runner.hooks, () => {
          assert.propertyVal(transaction.test, 'request', transaction.request);
          assert.propertyVal(
            transaction.test,
            'expected',
            transaction.expected,
          );
          assert.propertyVal(transaction.test, 'actual', transaction.real);
          done();
        }));
    });

    describe('with ‘before’ hook that throws a chai expectation error', () => {
      beforeEach(() => {
        runner.hooks.beforeHooks = {
          'Group Machine > Machine > Delete Message > Bogus example name': [
            // eslint-disable-next-line
            (transaction) => assert.isOk(false),
          ],
        };
        sinon.stub(configuration.emitter, 'emit');
      });

      afterEach(() => configuration.emitter.emit.restore());

      it('should not report an error', (done) =>
        runner.executeAllTransactions([transaction], runner.hooks, () => {
          assert.notOk(configuration.emitter.emit.calledWith('test error'));
          done();
        }));

      it('should report a fail', (done) =>
        runner.executeAllTransactions([transaction], runner.hooks, () => {
          assert.isOk(configuration.emitter.emit.calledWith('test fail'));
          done();
        }));

      it('should add fail message as a error under `errors` to the results on transaction', (done) =>
        runner.executeAllTransactions([transaction], runner.hooks, () => {
          const messages = transaction.errors.map((value) => value.message);
          assert.include(messages.join(), 'expected false to be truthy');
          done();
        }));

      it('should add fail message as a error under `errors` to the results on test passed to the emitter', (done) =>
        runner.executeAllTransactions([transaction], runner.hooks, () => {
          const messages = [];
          const { callCount } = configuration.emitter.emit;
          for (
            let callNo = 0, end = callCount - 1, asc = end >= 0;
            asc ? callNo <= end : callNo >= end;
            asc ? callNo++ : callNo--
          ) {
            messages.push(
              configuration.emitter.emit
                .getCall(callNo)
                .args[1].errors.map((value) => value.message),
            );
          }
          assert.include(messages.join(), 'expected false to be truthy');
          done();
        }));

      it('should set transaction info on the failed test', (done) =>
        runner.executeAllTransactions([transaction], runner.hooks, () => {
          assert.propertyVal(transaction.test, 'request', transaction.request);
          assert.propertyVal(
            transaction.test,
            'expected',
            transaction.expected,
          );
          assert.propertyVal(transaction.test, 'actual', transaction.real);
          done();
        }));
    });

    describe('with ‘after’ hook that throws a chai expectation error', () => {
      beforeEach(() => {
        runner.hooks.afterHooks = {
          'Group Machine > Machine > Delete Message > Bogus example name': [
            // eslint-disable-next-line
            (transaction) => assert.isOk(false),
          ],
        };
        sinon.stub(configuration.emitter, 'emit');
      });

      afterEach(() => configuration.emitter.emit.restore());

      it('should not report an error', (done) =>
        runner.executeAllTransactions([transaction], runner.hooks, () => {
          assert.notOk(configuration.emitter.emit.calledWith('test error'));
          done();
        }));

      it('should report a fail', (done) =>
        runner.executeAllTransactions([transaction], runner.hooks, () => {
          assert.isOk(configuration.emitter.emit.calledWith('test fail'));
          done();
        }));

      it('should set test as failed', (done) =>
        runner.executeAllTransactions([transaction], runner.hooks, () => {
          assert.equal(transaction.test.status, 'fail');
          done();
        }));

      it('should add fail message as a error under `errors` to the results on transaction', (done) =>
        runner.executeAllTransactions([transaction], runner.hooks, () => {
          const messages = transaction.errors.map((value) => value.message);
          assert.include(messages.join(), 'expected false to be truthy');
          done();
        }));

      it('should add fail message as a error under `errors` to the results on test passed to the emitter', (done) =>
        runner.executeAllTransactions([transaction], runner.hooks, () => {
          const messages = [];
          const { callCount } = configuration.emitter.emit;
          for (
            let callNo = 0, end = callCount - 1, asc = end >= 0;
            asc ? callNo <= end : callNo >= end;
            asc ? callNo++ : callNo--
          ) {
            messages.push(
              configuration.emitter.emit
                .getCall(callNo)
                .args[1].errors.map((value) => value.message),
            );
          }
          assert.include(messages.join(), 'expected false to be truthy');
          done();
        }));

      it('should set transaction info on the failed test', (done) =>
        runner.executeAllTransactions([transaction], runner.hooks, () => {
          assert.propertyVal(transaction.test, 'request', transaction.request);
          assert.propertyVal(
            transaction.test,
            'expected',
            transaction.expected,
          );
          assert.propertyVal(transaction.test, 'actual', transaction.real);
          done();
        }));
    });

    describe('with hook failing the transaction', () => {
      describe('in ‘before’ hook', () => {
        let clonedTransaction = null;
        beforeEach(() => {
          clonedTransaction = clone(transaction);
          runner.hooks.beforeHooks = {
            'Group Machine > Machine > Delete Message > Bogus example name': [
              (hookTransaction) => {
                hookTransaction.fail = 'Message before';
              },
            ],
          };
          sinon.stub(configuration.emitter, 'emit');
        });

        afterEach(() => configuration.emitter.emit.restore());

        it('should fail the test', (done) =>
          runner.executeAllTransactions(
            [clonedTransaction],
            runner.hooks,
            () => {
              assert.isOk(configuration.emitter.emit.calledWith('test fail'));
              done();
            },
          ));

        it('should not run the transaction', (done) =>
          runner.executeAllTransactions(
            [clonedTransaction],
            runner.hooks,
            () => {
              assert.notOk(server.isDone());
              done();
            },
          ));

        it('should pass the failing message to the emitter', (done) =>
          runner.executeAllTransactions(
            [clonedTransaction],
            runner.hooks,
            () => {
              const messages = [];
              const { callCount } = configuration.emitter.emit;
              for (
                let callNo = 0, end = callCount - 1, asc = end >= 0;
                asc ? callNo <= end : callNo >= end;
                asc ? callNo++ : callNo--
              ) {
                messages.push(
                  configuration.emitter.emit.getCall(callNo).args[1].message,
                );
              }
              assert.include(messages.join(), 'Message before');
              done();
            },
          ));

        it('should mention before hook in the error message', (done) =>
          runner.executeAllTransactions(
            [clonedTransaction],
            runner.hooks,
            () => {
              const messages = [];
              const { callCount } = configuration.emitter.emit;
              for (
                let callNo = 0, end = callCount - 1, asc = end >= 0;
                asc ? callNo <= end : callNo >= end;
                asc ? callNo++ : callNo--
              ) {
                messages.push(
                  configuration.emitter.emit.getCall(callNo).args[1].message,
                );
              }
              assert.include(messages.join(), 'Failed in before hook:');
              done();
            },
          ));

        it('should add fail message as a error under `errors` to the results on the transaction', (done) =>
          runner.executeAllTransactions(
            [clonedTransaction],
            runner.hooks,
            () => {
              const messages = clonedTransaction.errors.map(
                (value) => value.message,
              );
              assert.include(messages.join(), 'Message before');
              done();
            },
          ));

        it('should add fail message as a error under `errors` to the results on test passed to the emitter', (done) =>
          runner.executeAllTransactions(
            [clonedTransaction],
            runner.hooks,
            () => {
              const messages = [];
              const { callCount } = configuration.emitter.emit;
              for (
                let callNo = 0, end = callCount - 1, asc = end >= 0;
                asc ? callNo <= end : callNo >= end;
                asc ? callNo++ : callNo--
              ) {
                messages.push(
                  configuration.emitter.emit
                    .getCall(callNo)
                    .args[1].errors.map((value) => value.message),
                );
              }
              assert.include(messages.join(), 'Message before');
              done();
            },
          ));

        it('should set transaction info on the failed test', (done) =>
          runner.executeAllTransactions(
            [clonedTransaction],
            runner.hooks,
            () => {
              assert.propertyVal(
                clonedTransaction.test,
                'request',
                clonedTransaction.request,
              );
              assert.propertyVal(
                clonedTransaction.test,
                'expected',
                clonedTransaction.expected,
              );
              assert.propertyVal(
                clonedTransaction.test,
                'actual',
                clonedTransaction.real,
              );
              done();
            },
          ));

        describe('when message is set to fail also in ‘after’ hook', () => {
          clonedTransaction = null;
          beforeEach(() => {
            clonedTransaction = clone(transaction);
            runner.hooks.afterHooks = {
              'Group Machine > Machine > Delete Message > Bogus example name': [
                (hookTransaction) => {
                  hookTransaction.fail = 'Message after';
                },
              ],
            };
          });

          it('should not pass the failing message to the emitter', (done) =>
            runner.executeAllTransactions(
              [clonedTransaction],
              runner.hooks,
              () => {
                const messages = [];
                const { callCount } = configuration.emitter.emit;
                for (
                  let callNo = 0, end = callCount - 1, asc = end >= 0;
                  asc ? callNo <= end : callNo >= end;
                  asc ? callNo++ : callNo--
                ) {
                  messages.push(
                    configuration.emitter.emit.getCall(callNo).args[1].message,
                  );
                }
                assert.notInclude(messages.join(), 'Message after fail');
                done();
              },
            ));

          it('should not mention after hook in the error message', (done) =>
            runner.executeAllTransactions(
              [clonedTransaction],
              runner.hooks,
              () => {
                const messages = [];
                const { callCount } = configuration.emitter.emit;
                for (
                  let callNo = 0, end = callCount - 1, asc = end >= 0;
                  asc ? callNo <= end : callNo >= end;
                  asc ? callNo++ : callNo--
                ) {
                  messages.push(
                    configuration.emitter.emit.getCall(callNo).args[1].message,
                  );
                }
                assert.notInclude(messages.join(), 'Failed in after hook:');
                done();
              },
            ));

          it('should not add fail message as a error under `errors` to the results on the transaction', (done) =>
            runner.executeAllTransactions(
              [clonedTransaction],
              runner.hooks,
              () => {
                const messages = clonedTransaction.errors.map(
                  (value) => value.message,
                );
                assert.notInclude(messages.join(), 'Message after fail');
                done();
              },
            ));

          it('should not add fail message as a error under `errors` to the results on test passed to the emitter', (done) =>
            runner.executeAllTransactions(
              [clonedTransaction],
              runner.hooks,
              () => {
                const messages = [];
                const { callCount } = configuration.emitter.emit;
                for (
                  let callNo = 0, end = callCount - 1, asc = end >= 0;
                  asc ? callNo <= end : callNo >= end;
                  asc ? callNo++ : callNo--
                ) {
                  messages.push(
                    configuration.emitter.emit
                      .getCall(callNo)
                      .args[1].errors.map((value) => value.message),
                  );
                }
                assert.notInclude(messages.join(), 'Message after fail');
                done();
              },
            ));

          it('should set transaction info on the failed test', (done) =>
            runner.executeAllTransactions(
              [clonedTransaction],
              runner.hooks,
              () => {
                assert.propertyVal(
                  clonedTransaction.test,
                  'request',
                  clonedTransaction.request,
                );
                assert.propertyVal(
                  clonedTransaction.test,
                  'expected',
                  clonedTransaction.expected,
                );
                assert.propertyVal(
                  clonedTransaction.test,
                  'actual',
                  clonedTransaction.real,
                );
                done();
              },
            ));
        });
      });

      describe('in ‘after’ hook when transaction fails ', () => {
        let modifiedTransaction = {};
        beforeEach(() => {
          modifiedTransaction = clone(transaction);
          modifiedTransaction.expected.statusCode = '303';

          runner.hooks.afterHooks = {
            'Group Machine > Machine > Delete Message > Bogus example name': [
              (hookTransaction) => {
                hookTransaction.fail = 'Message after fail';
              },
            ],
          };
          sinon.stub(configuration.emitter, 'emit');
        });

        afterEach(() => {
          configuration.emitter.emit.resetHistory();
          configuration.emitter.emit.restore();
        });

        it('should make the request', (done) =>
          runner.executeAllTransactions(
            [modifiedTransaction],
            runner.hooks,
            () => {
              assert.isOk(server.isDone());
              done();
            },
          ));

        it('should not fail again', (done) =>
          runner.executeAllTransactions(
            [modifiedTransaction],
            runner.hooks,
            () => {
              let failCount = 0;
              const messages = [];
              const { callCount } = configuration.emitter.emit;
              for (
                let callNo = 0, end = callCount - 1, asc = end >= 0;
                asc ? callNo <= end : callNo >= end;
                asc ? callNo++ : callNo--
              ) {
                if (
                  configuration.emitter.emit.getCall(callNo).args[0] ===
                  'test fail'
                ) {
                  failCount++;
                }
                messages.push(
                  configuration.emitter.emit.getCall(callNo).args[1].message,
                );
              }
              assert.equal(failCount, 1);
              done();
            },
          ));

        it('should not pass the hook message to the emitter', (done) =>
          runner.executeAllTransactions(
            [modifiedTransaction],
            runner.hooks,
            () => {
              const messages = [];
              const { callCount } = configuration.emitter.emit;
              for (
                let callNo = 0, end = callCount - 1, asc = end >= 0;
                asc ? callNo <= end : callNo >= end;
                asc ? callNo++ : callNo--
              ) {
                messages.push(
                  configuration.emitter.emit.getCall(callNo).args[1].message,
                );
              }
              assert.notInclude(messages, 'Message after fail');
              done();
            },
          ));

        it('should not mention after hook in the error message', (done) =>
          runner.executeAllTransactions(
            [modifiedTransaction],
            runner.hooks,
            () => {
              const messages = [];
              const { callCount } = configuration.emitter.emit;
              for (
                let callNo = 0, end = callCount - 1, asc = end >= 0;
                asc ? callNo <= end : callNo >= end;
                asc ? callNo++ : callNo--
              ) {
                messages.push(
                  configuration.emitter.emit.getCall(callNo).args[1].message,
                );
              }
              assert.notInclude(messages, 'Failed in after hook:');
              done();
            },
          ));

        it('should not add fail message as a error under `errors` to the results on the transaction', (done) =>
          runner.executeAllTransactions(
            [modifiedTransaction],
            runner.hooks,
            () => {
              const messages = modifiedTransaction.errors.map(
                (value) => value.message,
              );
              assert.notInclude(messages.join(), 'Message after fail');
              done();
            },
          ));

        it('should not add fail message as a error under `errors` to the results on test passed to the emitter', (done) =>
          runner.executeAllTransactions(
            [modifiedTransaction],
            runner.hooks,
            () => {
              const messages = [];
              const { callCount } = configuration.emitter.emit;
              for (
                let callNo = 0, end = callCount - 1, asc = end >= 0;
                asc ? callNo <= end : callNo >= end;
                asc ? callNo++ : callNo--
              ) {
                messages.push(
                  configuration.emitter.emit
                    .getCall(callNo)
                    .args[1].errors.map((value) => value.message),
                );
              }
              assert.notInclude(messages.join(), 'Message after fail');
              done();
            },
          ));

        it('should set transaction info on the failed test', (done) =>
          runner.executeAllTransactions(
            [modifiedTransaction],
            runner.hooks,
            () => {
              assert.propertyVal(
                modifiedTransaction.test,
                'request',
                modifiedTransaction.request,
              );
              assert.propertyVal(
                modifiedTransaction.test,
                'expected',
                modifiedTransaction.expected,
              );
              assert.propertyVal(
                modifiedTransaction.test,
                'actual',
                modifiedTransaction.real,
              );
              done();
            },
          ));
      });

      describe('in ‘after’ hook when transaction passes ', () => {
        let clonedTransaction = null;
        beforeEach(() => {
          clonedTransaction = clone(transaction);
          runner.hooks.afterHooks = {
            'Group Machine > Machine > Delete Message > Bogus example name': [
              (hookTransaction) => {
                hookTransaction.fail = 'Message after pass';
              },
            ],
          };
          sinon.stub(configuration.emitter, 'emit');
        });

        afterEach(() => {
          configuration.emitter.emit.resetHistory();
          configuration.emitter.emit.restore();
        });

        it('should make the request', (done) =>
          runner.executeAllTransactions(
            [clonedTransaction],
            runner.hooks,
            () => {
              assert.isOk(server.isDone());
              done();
            },
          ));

        it('it should fail the test', (done) =>
          runner.executeAllTransactions(
            [clonedTransaction],
            runner.hooks,
            () => {
              assert.isOk(configuration.emitter.emit.calledWith('test fail'));
              done();
            },
          ));

        it('it should not pass the test', (done) =>
          runner.executeAllTransactions(
            [clonedTransaction],
            runner.hooks,
            () => {
              assert.notOk(configuration.emitter.emit.calledWith('test pass'));
              done();
            },
          ));

        it('it should pass the failing message to the emitter', (done) =>
          runner.executeAllTransactions(
            [clonedTransaction],
            runner.hooks,
            () => {
              const messages = [];
              const { callCount } = configuration.emitter.emit;
              for (
                let callNo = 0, end = callCount - 1, asc = end >= 0;
                asc ? callNo <= end : callNo >= end;
                asc ? callNo++ : callNo--
              ) {
                messages.push(
                  configuration.emitter.emit.getCall(callNo).args[1].message,
                );
              }
              assert.include(messages.join(), 'Message after pass');
              done();
            },
          ));

        it('should mention after hook in the error message', (done) =>
          runner.executeAllTransactions(
            [clonedTransaction],
            runner.hooks,
            () => {
              const messages = [];
              const { callCount } = configuration.emitter.emit;
              for (
                let callNo = 0, end = callCount - 1, asc = end >= 0;
                asc ? callNo <= end : callNo >= end;
                asc ? callNo++ : callNo--
              ) {
                messages.push(
                  configuration.emitter.emit.getCall(callNo).args[1].message,
                );
              }
              assert.include(messages.join(), 'Failed in after hook:');
              done();
            },
          ));

        it('should set transaction test status to failed', (done) =>
          runner.executeAllTransactions(
            [clonedTransaction],
            runner.hooks,
            () => {
              assert.equal(clonedTransaction.test.status, 'fail');
              done();
            },
          ));

        it('should add fail message as a error under `errors` to the results', (done) =>
          runner.executeAllTransactions(
            [clonedTransaction],
            runner.hooks,
            () => {
              const messages = clonedTransaction.errors.map(
                (value) => value.message,
              );
              assert.include(messages.join(), 'Message after pass');
              done();
            },
          ));

        it('should not add fail message as a error under `errors` to the results on test passed to the emitter', (done) =>
          runner.executeAllTransactions(
            [clonedTransaction],
            runner.hooks,
            () => {
              const messages = [];
              const { callCount } = configuration.emitter.emit;
              for (
                let callNo = 0, end = callCount - 1, asc = end >= 0;
                asc ? callNo <= end : callNo >= end;
                asc ? callNo++ : callNo--
              ) {
                messages.push(
                  configuration.emitter.emit
                    .getCall(callNo)
                    .args[1].errors.map((value) => value.message),
                );
              }
              assert.include(messages.join(), 'Message after pass');
              done();
            },
          ));
      });
    });

    describe('without hooks', () => {
      beforeEach(() => sinon.stub(configuration.emitter, 'emit'));

      afterEach(() => {
        configuration.emitter.emit.resetHistory();
        configuration.emitter.emit.restore();
      });

      it('should not run the hooks', (done) =>
        runner.executeAllTransactions([transaction], runner.hooks, () =>
          done(),
        ));

      it('should pass the transactions', (done) =>
        runner.executeAllTransactions([transaction], runner.hooks, (error) => {
          if (error) {
            done(error);
          }
          assert.isOk(configuration.emitter.emit.calledWith('test pass'));
          done();
        }));
    });

    describe('with hook modifying the transaction body and backend Express app using the body parser', () => {
      before(() => nock.enableNetConnect());

      after(() => nock.disableNetConnect());

      it("should perform the transaction and don't hang", (done) => {
        nock.cleanAll();

        const receivedRequests = [];

        runner.hooks.beforeHooks = {
          'Group Machine > Machine > Delete Message > Bogus example name': [
            // eslint-disable-next-line
            function(transaction) {
              const body = JSON.parse(transaction.request.body);
              body.name = 'Michael';
              transaction.request.body = JSON.stringify(body);
              transaction.request.headers['Content-Length'] =
                transaction.request.body.length;
            },
          ],
        };

        const app = express();
        app.use(bodyParser.json());

        app.post('/machines', (req, res) => {
          receivedRequests.push(req);
          res.json([{ type: 'bulldozer', name: 'willy' }]);
        });

        server = app.listen(transaction.port, () =>
          runner.executeAllTransactions([transaction], runner.hooks, () => {
            // Should not hang here
            assert.isOk(true);
            server.close();
          }),
        );

        server.on('close', () => {
          assert.equal(receivedRequests.length, 1);
          done();
        });
      });
    });
  });
});
