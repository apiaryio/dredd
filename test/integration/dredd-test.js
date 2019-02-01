const bodyParser = require('body-parser');
const clone = require('clone');
const express = require('express');
const fs = require('fs');
const proxyquire = require('proxyquire').noCallThru();
const sinon = require('sinon');
const { assert } = require('chai');

const loggerStub = require('../../lib/logger');

const PORT = 9876;

let exitStatus;

let stderr = '';
let stdout = '';

const addHooksStub = proxyquire('../../lib/addHooks', {
  './logger': loggerStub,
});

const transactionRunner = proxyquire('../../lib/TransactionRunner', {
  './addHooks': addHooksStub,
  './logger': loggerStub,
});

const Dredd = proxyquire('../../lib/Dredd', {
  './TransactionRunner': transactionRunner,
  './logger': loggerStub,
});

function execCommand(options = {}, cb) {
  stdout = '';
  stderr = '';
  exitStatus = null;
  let finished = false;
  if (!options.server) { options.server = `http://127.0.0.1:${PORT}`; }
  if (!options.level) { options.level = 'info'; }
  new Dredd(options).run((error, stats = {}) => {
    if (!finished) {
      finished = true;
      if (error ? error.message : undefined) {
        stderr += error.message;
      }
      exitStatus = (error || (((1 * stats.failures) + (1 * stats.errors)) > 0)) ? 1 : 0;
      cb(null, stdout, stderr, exitStatus);
    }
  });
}

describe('Dredd class Integration', () => {
  before(() => {
    ['warn', 'error'].forEach((method) => {
      sinon.stub(loggerStub, method).callsFake((chunk) => { stderr += `\n${method}: ${chunk}`; });
    });
    [
      'log', 'info', 'silly', 'verbose', 'test',
      'hook', 'complete', 'pass', 'skip', 'debug',
      'fail', 'request', 'expected', 'actual',
    ].forEach((method) => {
      sinon.stub(loggerStub, method).callsFake((chunk) => { stdout += `\n${method}: ${chunk}`; });
    });
  });

  after(() => {
    ['warn', 'error'].forEach((method) => {
      loggerStub[method].restore();
    });
    [
      'log', 'info', 'silly', 'verbose', 'test',
      'hook', 'complete', 'pass', 'skip', 'debug',
      'fail', 'request', 'expected', 'actual',
    ].forEach((method) => {
      loggerStub[method].restore();
    });
  });


  describe('when creating Dredd instance with existing API description document and responding server', () => {
    describe('when the server is responding as specified in the API description', () => {
      before((done) => {
        const cmd = {
          options: {
            path: './test/fixtures/single-get.apib',
          },
        };

        const app = express();

        app.get('/machines', (req, res) => res.json([{ type: 'bulldozer', name: 'willy' }]));

        const server = app.listen(PORT, () => execCommand(cmd, () => server.close()));

        server.on('close', done);
      });

      it('exit status should be 0', () => assert.equal(exitStatus, 0));
    });

    describe('when the server is sending different response', () => {
      before((done) => {
        const cmd = {
          options: {
            path: ['./test/fixtures/single-get.apib'],
          },
        };

        const app = express();

        app.get('/machines', (req, res) => res.status(201).json([{ kind: 'bulldozer', imatriculation: 'willy' }]));

        const server = app.listen(PORT, () => execCommand(cmd, () => server.close()));

        server.on('close', done);
      });

      it('exit status should be 1', () => assert.equal(exitStatus, 1));
    });
  });


  describe("when using reporter -r apiary with 'verbose' logging with custom apiaryApiKey and apiaryApiName", () => {
    let server;
    let server2;
    let receivedRequest;
    let receivedRequestTestRuns;
    let receivedHeaders;
    let receivedHeadersRuns;
    exitStatus = null;

    before((done) => {
      const cmd = {
        options: {
          path: ['./test/fixtures/single-get.apib'],
          reporter: ['apiary'],
          level: 'verbose',
        },
        custom: {
          apiaryApiUrl: `http://127.0.0.1:${PORT + 1}`,
          apiaryApiKey: 'the-key',
          apiaryApiName: 'the-api-name',
        },
      };

      receivedHeaders = {};
      receivedHeadersRuns = {};

      const apiary = express();
      const app = express();

      apiary.use(bodyParser.json({ size: '5mb' }));

      apiary.post('/apis/*', (req, res) => {
        if (req.body && (req.url.indexOf('/tests/steps') > -1)) {
          if (!receivedRequest) { receivedRequest = clone(req.body); }
          Object.keys(req.headers).forEach((name) => {
            receivedHeaders[name.toLowerCase()] = req.headers[name];
          });
        }
        if (req.body && (req.url.indexOf('/tests/runs') > -1)) {
          if (!receivedRequestTestRuns) { receivedRequestTestRuns = clone(req.body); }
          Object.keys(req.headers).forEach((name) => {
            receivedHeadersRuns[name.toLowerCase()] = req.headers[name];
          });
        }
        res.status(201).json({
          _id: '1234_id',
          testRunId: '6789_testRunId',
          reportUrl: 'http://url.me/test/run/1234_id',
        });
      });

      apiary.all('*', (req, res) => res.json({}));

      app.get('/machines', (req, res) => res.json([{ type: 'bulldozer', name: 'willy' }]));

      server = app.listen(PORT, () => {
        server2 = apiary.listen((PORT + 1), () => {
          execCommand(cmd, () => server2.close(() => server.close(() => done())));
        });
      });
    });

    it('should not print warning about missing Apiary API settings', () => assert.notInclude(stderr, 'Apiary API Key or API Project Subdomain were not provided.'));

    it('should contain Authentication header thanks to apiaryApiKey and apiaryApiName configuration', () => {
      assert.propertyVal(receivedHeaders, 'authentication', 'Token the-key');
      assert.propertyVal(receivedHeadersRuns, 'authentication', 'Token the-key');
    });

    it('should send the test-run as a non-public one', () => {
      assert.isObject(receivedRequestTestRuns);
      assert.propertyVal(receivedRequestTestRuns, 'public', false);
    });

    it('should print using the new reporter', () => assert.include(stdout, 'http://url.me/test/run/1234_id'));

    it('should send results from Gavel', () => {
      assert.isObject(receivedRequest);
      assert.nestedProperty(receivedRequest, 'resultData.request');
      assert.nestedProperty(receivedRequest, 'resultData.realResponse');
      assert.nestedProperty(receivedRequest, 'resultData.expectedResponse');
      assert.nestedProperty(receivedRequest, 'resultData.result.body.validator');
      assert.nestedProperty(receivedRequest, 'resultData.result.headers.validator');
      assert.nestedProperty(receivedRequest, 'resultData.result.statusCode.validator');

      it('prints out an error message', () => assert.notEqual(exitStatus, 0));
    });
  });


  describe('when called with arguments', () => {
    describe('--path argument is a string', () => {
      before((done) => {
        const cmd = {
          options: {
            path: ['./test/fixtures/single-get.apib', './test/fixtures/single-get.apib'],
          },
        };

        const app = express();

        app.get('/machines', (req, res) => {
          const response = [{ type: 'bulldozer', name: 'willy' }];
          res.json(response);
        });

        const server = app.listen(PORT, () => execCommand(cmd, () => {
          server.close();
        }));

        server.on('close', done);
      });

      it('prints out ok', () => assert.equal(exitStatus, 0));
    });

    describe("when using reporter -r apiary and the server isn't running", () => {
      let server2;
      let receivedRequest;
      exitStatus = null;

      before((done) => {
        const cmd = {
          options: {
            path: ['./test/fixtures/single-get.apib'],
            reporter: ['apiary'],
            level: 'verbose',
          },
          custom: {
            apiaryReporterEnv: {
              APIARY_API_URL: `http://127.0.0.1:${PORT + 1}`,
            },
          },
        };

        const apiary = express();

        apiary.use(bodyParser.json({ size: '5mb' }));

        apiary.post('/apis/*', (req, res) => {
          if (req.body && (req.url.indexOf('/tests/steps') > -1)) {
            if (!receivedRequest) { receivedRequest = clone(req.body); }
          }
          res.status(201).json({
            _id: '1234_id',
            testRunId: '6789_testRunId',
            reportUrl: 'http://url.me/test/run/1234_id',
          });
        });

        apiary.all('*', (req, res) => res.json({}));

        server2 = apiary.listen((PORT + 1), () => execCommand(cmd, () => server2.close(() => {})));

        server2.on('close', done);
      });

      it('should print using the reporter', () => assert.include(stdout, 'http://url.me/test/run/1234_id'));

      it('should send results from gavel', () => {
        assert.isObject(receivedRequest);
        assert.nestedProperty(receivedRequest, 'resultData.request');
        assert.nestedProperty(receivedRequest, 'resultData.expectedResponse');
        assert.nestedProperty(receivedRequest, 'resultData.result.general');
      });

      it('report should have message about server being down', () => {
        const message = receivedRequest.resultData.result.general[0].message;
        assert.include(message, 'connect');
      });
    });

    describe('when using reporter -r apiary', () => {
      let server;
      let server2;
      let receivedRequest;
      exitStatus = null;

      before((done) => {
        const cmd = {
          options: {
            path: ['./test/fixtures/single-get.apib'],
            reporter: ['apiary'],
            level: 'verbose',
          },
          custom: {
            apiaryReporterEnv: {
              APIARY_API_URL: `http://127.0.0.1:${PORT + 1}`,
            },
          },
        };

        const apiary = express();
        const app = express();

        apiary.use(bodyParser.json({ size: '5mb' }));

        apiary.post('/apis/*', (req, res) => {
          if (req.body && (req.url.indexOf('/tests/steps') > -1)) {
            if (!receivedRequest) { receivedRequest = clone(req.body); }
          }
          res.status(201).json({
            _id: '1234_id',
            testRunId: '6789_testRunId',
            reportUrl: 'http://url.me/test/run/1234_id',
          });
        });

        apiary.all('*', (req, res) => res.json({}));

        app.get('/machines', (req, res) => res.json([{ type: 'bulldozer', name: 'willy' }]));

        server = app.listen(PORT, () => { server2 = apiary.listen((PORT + 1), () => {}); });

        execCommand(cmd, () => server2.close(() => server.close(() => {})));

        server.on('close', done);
      });

      it('should print warning about missing Apiary API settings', () => assert.include(stderr, 'Apiary API Key or API Project Subdomain were not provided.'));

      it('should print link to documentation', () => assert.include(stderr, 'https://dredd.org/en/latest/how-to-guides/#using-apiary-reporter-and-apiary-tests'));

      it('should print using the new reporter', () => assert.include(stdout, 'http://url.me/test/run/1234_id'));

      it('should send results from Gavel', () => {
        assert.isObject(receivedRequest);
        assert.nestedProperty(receivedRequest, 'resultData.request');
        assert.nestedProperty(receivedRequest, 'resultData.realResponse');
        assert.nestedProperty(receivedRequest, 'resultData.expectedResponse');
        assert.nestedProperty(receivedRequest, 'resultData.result.body.validator');
        assert.nestedProperty(receivedRequest, 'resultData.result.headers.validator');
        assert.nestedProperty(receivedRequest, 'resultData.result.statusCode.validator');
      });
    });
  });


  describe("when API description document should be loaded from 'http(s)://...' url", () => {
    let app;
    let server;
    let connectedToServer = null;
    let notFound;
    let fileFound;

    const errorCmd = {
      server: `http://127.0.0.1:${PORT + 1}`,
      options: {
        path: [`http://127.0.0.1:${PORT + 1}/connection-error.apib`],
      },
    };

    const wrongCmd = {
      options: {
        path: [`http://127.0.0.1:${PORT}/not-found.apib`],
      },
    };

    const goodCmd = {
      options: {
        path: [`http://127.0.0.1:${PORT}/file.apib`],
      },
    };

    afterEach(() => { connectedToServer = null; });

    before((done) => {
      app = express();

      app.use((req, res, next) => {
        connectedToServer = true;
        next();
      });

      app.get('/', (req, res) => res.sendStatus(404));

      app.get('/file.apib', (req, res) => {
        fileFound = true;
        res.type('text');
        fs.createReadStream('./test/fixtures/single-get.apib').pipe(res);
      });

      app.get('/machines', (req, res) => res.json([{ type: 'bulldozer', name: 'willy' }]));

      app.get('/not-found.apib', (req, res) => {
        notFound = true;
        res.status(404).end();
      });

      server = app.listen(PORT, () => done());
    });

    after(done => server.close(() => {
      app = null;
      server = null;
      done();
    }));

    describe('and I try to load a file from bad hostname at all', () => {
      before(done => execCommand(errorCmd, () => done()));

      after(() => { connectedToServer = null; });

      it('should not send a GET to the server', () => assert.isNull(connectedToServer));

      it('should exit with status 1', () => assert.equal(exitStatus, 1));

      it('should print error message to stderr', () => {
        assert.include(stderr, 'Error when loading file from URL');
        assert.include(stderr, 'Is the provided URL correct?');
        assert.include(stderr, 'connection-error.apib');
      });
    });

    describe('and I try to load a file that does not exist from an existing server', () => {
      before(done => execCommand(wrongCmd, () => done()));

      after(() => { connectedToServer = null; });

      it('should connect to the right server', () => assert.isTrue(connectedToServer));

      it('should send a GET to server at wrong URL', () => assert.isTrue(notFound));

      it('should exit with status 1', () => assert.equal(exitStatus, 1));

      it('should print error message to stderr', () => {
        assert.include(stderr, 'Unable to load file from URL');
        assert.include(stderr, 'responded with status code 404');
        assert.include(stderr, 'not-found.apib');
      });
    });

    describe('and I try to load a file that actually is there', () => {
      before(done => execCommand(goodCmd, () => done()));

      it('should send a GET to the right server', () => assert.isTrue(connectedToServer));

      it('should send a GET to server at good URL', () => assert.isTrue(fileFound));

      it('should exit with status 0', () => assert.equal(exitStatus, 0));
    });
  });

  describe('when OpenAPI 2 document has multiple responses', () => {
    const reTransaction = /(\w+): (\w+) \((\d+)\) \/honey/g;
    let actual;

    before(done => execCommand({
      options: {
        path: './test/fixtures/multiple-responses.yaml',
      },
    },
    (err) => {
      let groups;
      const matches = [];
      // eslint-disable-next-line
        while (groups = reTransaction.exec(stdout)) { matches.push(groups); }
      actual = matches.map((match) => {
        const keyMap = {
          0: 'name', 1: 'action', 2: 'method', 3: 'statusCode',
        };
        return match.reduce((result, element, i) => Object.assign(result, { [keyMap[i]]: element }),
          {});
      });
      done(err);
    }));

    it('recognizes all 3 transactions', () => assert.equal(actual.length, 3));

    [
      { action: 'skip', statusCode: '400' },
      { action: 'skip', statusCode: '500' },
      { action: 'fail', statusCode: '200' },
    ].forEach((expected, i) => context(`the transaction #${i + 1}`, () => {
      it(`has status code ${expected.statusCode}`, () => assert.equal(expected.statusCode, actual[i].statusCode));
      it(`is ${expected.action === 'skip' ? '' : 'not '}skipped by default`, () => assert.equal(expected.action, actual[i].action));
    }));
  });

  describe('when OpenAPI 2 document has multiple responses and hooks unskip some of them', () => {
    const reTransaction = /(\w+): (\w+) \((\d+)\) \/honey/g;
    let actual;

    before(done => execCommand({
      options: {
        path: './test/fixtures/multiple-responses.yaml',
        hookfiles: './test/fixtures/openapi2-multiple-responses.js',
      },
    },
    (err) => {
      let groups;
      const matches = [];
      // eslint-disable-next-line
        while (groups = reTransaction.exec(stdout)) { matches.push(groups); }
      actual = matches.map((match) => {
        const keyMap = {
          0: 'name', 1: 'action', 2: 'method', 3: 'statusCode',
        };
        return match.reduce((result, element, i) => Object.assign(result, { [keyMap[i]]: element }),
          {});
      });
      done(err);
    }));

    it('recognizes all 3 transactions', () => assert.equal(actual.length, 3));

    [
      { action: 'skip', statusCode: '400' },
      { action: 'fail', statusCode: '200' },
      { action: 'fail', statusCode: '500' }, // Unskipped in hooks
    ].forEach((expected, i) => context(`the transaction #${i + 1}`, () => {
      it(`has status code ${expected.statusCode}`, () => assert.equal(expected.statusCode, actual[i].statusCode));

      const defaultMessage = `is ${expected.action === 'skip' ? '' : 'not '}skipped by default`;
      const unskippedMessage = 'is unskipped in hooks';
      it(`${expected.statusCode === '500' ? unskippedMessage : defaultMessage}`, () => assert.equal(expected.action, actual[i].action));
    }));
  });

  describe('when using OpenAPI 2 document with hooks', () => {
    const reTransactionName = /hook: (.+)/g;
    let matches;

    before(done => execCommand({
      options: {
        path: './test/fixtures/multiple-responses.yaml',
        hookfiles: './test/fixtures/openapi2-transaction-names.js',
      },
    },
    (err) => {
      let groups;
      matches = [];
      // eslint-disable-next-line
        while (groups = reTransactionName.exec(stdout)) { matches.push(groups[1]); }
      done(err);
    }));

    it('transaction names contain status code and content type', () => assert.deepEqual(matches, [
      '/honey > GET > 200 > application/json',
      '/honey > GET > 400 > application/json',
      '/honey > GET > 500 > application/json',
    ]));
  });
});
