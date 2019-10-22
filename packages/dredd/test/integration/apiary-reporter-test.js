import R from 'ramda';
import bodyParser from 'body-parser';
import clone from 'clone';
import express from 'express';
import fs from 'fs';
import { assert } from 'chai';

import logger from '../../lib/logger';
import reporterOutputLogger from '../../lib/reporters/reporterOutputLogger';
import Dredd from '../../lib/Dredd';

const PORT = 9876;

let exitStatus;

let output = '';

function execCommand(options = {}, cb) {
  output = '';
  exitStatus = null;
  let finished = false;

  const defaultOptions = {
    server: `http://127.0.0.1:${PORT}`,
    options: {
      loglevel: 'warning',
    },
  };
  const dreddOptions = R.mergeDeepLeft(options, defaultOptions);

  new Dredd(dreddOptions).run((error, stats = {}) => {
    if (!finished) {
      finished = true;
      if (error ? error.message : undefined) {
        output += error.message;
      }
      exitStatus = error || 1 * stats.failures + 1 * stats.errors > 0 ? 1 : 0;
      cb();
    }
  });
}

function record(transport, level, message) {
  output += `\n${level}: ${message}`;
}

// These tests were separated out from a larger file. They deserve a rewrite,
// see https://github.com/apiaryio/dredd/issues/1288
describe('Apiary reporter', () => {
  before(() => {
    logger.transports.console.silent = true;
    logger.on('logging', record);

    reporterOutputLogger.transports.console.silent = true;
    reporterOutputLogger.on('logging', record);
  });

  after(() => {
    logger.transports.console.silent = false;
    logger.removeListener('logging', record);

    reporterOutputLogger.transports.console.silent = false;
    reporterOutputLogger.removeListener('logging', record);
  });

  describe("when using reporter -r apiary with 'debug' logging with custom apiaryApiKey and apiaryApiName", () => {
    let server;
    let server2;
    let receivedRequest;
    let receivedRequestTestRuns;
    let receivedHeaders;
    let receivedHeadersRuns;
    exitStatus = null;

    before((done) => {
      try {
        const cmd = {
          options: {
            path: ['./test/fixtures/single-get.apib'],
            reporter: ['apiary'],
            loglevel: 'debug',
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
          if (req.body && req.url.indexOf('/tests/steps') > -1) {
            if (!receivedRequest) {
              receivedRequest = clone(req.body);
            }
            Object.keys(req.headers).forEach((name) => {
              receivedHeaders[name.toLowerCase()] = req.headers[name];
            });
          }
          if (req.body && req.url.indexOf('/tests/runs') > -1) {
            if (!receivedRequestTestRuns) {
              receivedRequestTestRuns = clone(req.body);
            }
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

        app.get('/machines', (req, res) =>
          res.json([{ type: 'bulldozer', name: 'willy' }]),
        );

        server = app.listen(PORT, () => {
          server2 = apiary.listen(PORT + 1, () => {
            execCommand(cmd, () =>
              server2.close(() => server.close(() => done())),
            );
          });
        });
      } catch (error) {
        throw error;
      }
    });

    it('should not print warning about missing Apiary API settings', () =>
      assert.notInclude(
        output,
        'Apiary API Key or API Project Name were not provided.',
      ));

    it('should contain Authentication header thanks to apiaryApiKey and apiaryApiName configuration', () => {
      assert.propertyVal(receivedHeaders, 'authentication', 'Token the-key');
      assert.propertyVal(
        receivedHeadersRuns,
        'authentication',
        'Token the-key',
      );
    });

    it('should send the test-run as a non-public one', () => {
      assert.isObject(receivedRequestTestRuns);
      assert.propertyVal(receivedRequestTestRuns, 'public', false);
    });

    it('should print using the new reporter', () =>
      assert.include(output, 'http://url.me/test/run/1234_id'));

    it('should send results from Gavel', () => {
      assert.isObject(receivedRequest);
      assert.nestedProperty(receivedRequest, 'results.request');
      assert.nestedProperty(receivedRequest, 'results.realResponse');
      assert.nestedProperty(receivedRequest, 'results.expectedResponse');
      assert.nestedProperty(
        receivedRequest,
        'results.validationResult.fields.body.kind',
      );
      assert.nestedProperty(
        receivedRequest,
        'results.validationResult.fields.headers.kind',
      );
      assert.nestedProperty(
        receivedRequest,
        'results.validationResult.fields.statusCode.kind',
      );

      it('prints out an error message', () => assert.notEqual(exitStatus, 0));
    });
  });

  describe('when called with arguments', () => {
    describe("when using reporter -r apiary and the server isn't running", () => {
      let server2;
      let receivedRequest;
      exitStatus = null;

      before((done) => {
        const cmd = {
          options: {
            path: ['./test/fixtures/single-get.apib'],
            reporter: ['apiary'],
            loglevel: 'debug',
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
          if (req.body && req.url.indexOf('/tests/steps') > -1) {
            if (!receivedRequest) {
              receivedRequest = clone(req.body);
            }
          }
          res.status(201).json({
            _id: '1234_id',
            testRunId: '6789_testRunId',
            reportUrl: 'http://url.me/test/run/1234_id',
          });
        });

        apiary.all('*', (req, res) => res.json({}));

        server2 = apiary.listen(PORT + 1, () =>
          execCommand(cmd, () => server2.close(() => {})),
        );

        server2.on('close', done);
      });

      it('should print using the reporter', () =>
        assert.include(output, 'http://url.me/test/run/1234_id'));

      it('should send results from gavel', () => {
        assert.isObject(receivedRequest);
        assert.nestedProperty(receivedRequest, 'results.request');
        assert.nestedProperty(receivedRequest, 'results.expectedResponse');
        assert.nestedProperty(receivedRequest, 'results.errors');
      });

      it('report should have message about server being down', () => {
        const message = receivedRequest.results.errors[0].message;
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
            loglevel: 'debug',
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
          if (req.body && req.url.indexOf('/tests/steps') > -1) {
            if (!receivedRequest) {
              receivedRequest = clone(req.body);
            }
          }
          res.status(201).json({
            _id: '1234_id',
            testRunId: '6789_testRunId',
            reportUrl: 'http://url.me/test/run/1234_id',
          });
        });

        apiary.all('*', (req, res) => res.json({}));

        app.get('/machines', (req, res) =>
          res.json([{ type: 'bulldozer', name: 'willy' }]),
        );

        server = app.listen(PORT, () => {
          server2 = apiary.listen(PORT + 1, () => {});
        });

        execCommand(cmd, () => server2.close(() => server.close(() => {})));

        server.on('close', done);
      });

      it('should print warning about missing Apiary API settings', () =>
        assert.include(
          output,
          'Apiary API Key or API Project Name were not provided.',
        ));

      it('should print link to documentation', () =>
        assert.include(
          output,
          'https://dredd.org/en/latest/how-to-guides/#using-apiary-reporter-and-apiary-tests',
        ));

      it('should print using the new reporter', () =>
        assert.include(output, 'http://url.me/test/run/1234_id'));

      it('should send results from Gavel', () => {
        assert.isObject(receivedRequest);
        assert.nestedProperty(receivedRequest, 'results.request');
        assert.nestedProperty(receivedRequest, 'results.realResponse');
        assert.nestedProperty(receivedRequest, 'results.expectedResponse');
        assert.nestedProperty(
          receivedRequest,
          'results.validationResult.fields.body.kind',
        );
        assert.nestedProperty(
          receivedRequest,
          'results.validationResult.fields.headers.kind',
        );
        assert.nestedProperty(
          receivedRequest,
          'results.validationResult.fields.statusCode.kind',
        );
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

    afterEach(() => {
      connectedToServer = null;
    });

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

      app.get('/machines', (req, res) =>
        res.json([{ type: 'bulldozer', name: 'willy' }]),
      );

      app.get('/not-found.apib', (req, res) => {
        notFound = true;
        res.status(404).end();
      });

      server = app.listen(PORT, () => done());
    });

    after((done) =>
      server.close(() => {
        app = null;
        server = null;
        done();
      }),
    );

    describe('and I try to load a file from bad hostname at all', () => {
      before((done) => execCommand(errorCmd, () => done()));

      after(() => {
        connectedToServer = null;
      });

      it('should not send a GET to the server', () =>
        assert.isNull(connectedToServer));

      it('should exit with status 1', () => assert.equal(exitStatus, 1));

      it('should print error message to the output', () => {
        assert.include(output, 'Unable to load API description document from');
        assert.include(output, 'connection-error.apib');
      });
    });

    describe('and I try to load a file that does not exist from an existing server', () => {
      before((done) => execCommand(wrongCmd, () => done()));

      after(() => {
        connectedToServer = null;
      });

      it('should connect to the right server', () =>
        assert.isTrue(connectedToServer));

      it('should send a GET to server at wrong URL', () =>
        assert.isTrue(notFound));

      it('should exit with status 1', () => assert.equal(exitStatus, 1));

      it('should print error message to the output', () => {
        assert.include(output, 'Unable to load API description document from');
        assert.include(output, 'Dredd got HTTP 404 response without body');
        assert.include(output, 'not-found.apib');
      });
    });

    describe('and I try to load a file that actually is there', () => {
      before((done) => execCommand(goodCmd, () => done()));

      it('should send a GET to the right server', () =>
        assert.isTrue(connectedToServer));

      it('should send a GET to server at good URL', () =>
        assert.isTrue(fileFound));

      it('should exit with status 0', () => assert.equal(exitStatus, 0));
    });
  });
});
