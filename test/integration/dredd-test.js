const express = require('express');
const fs = require('fs');
const { assert } = require('chai');

const logger = require('../../lib/logger');
const reporterOutputLogger = require('../../lib/reporters/reporterOutputLogger');
const Dredd = require('../../lib/Dredd');

const PORT = 9876;

let exitStatus;

let output = '';

function execCommand(options = {}, cb) {
  output = '';
  exitStatus = null;
  let finished = false;
  if (!options.server) { options.server = `http://127.0.0.1:${PORT}`; }
  if (!options.loglevel) { options.loglevel = 'warning'; }
  new Dredd(options).run((error, stats = {}) => {
    if (!finished) {
      finished = true;
      if (error ? error.message : undefined) {
        output += error.message;
      }
      exitStatus = (error || (((1 * stats.failures) + (1 * stats.errors)) > 0)) ? 1 : 0;
      cb();
    }
  });
}


function record(transport, level, message) {
  output += `\n${level}: ${message}`;
}


describe('Dredd', () => {
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

      it('should print error message to the output', () => {
        assert.include(output, 'Unable to load API description document from');
        assert.include(output, 'connection-error.apib');
      });
    });

    describe('and I try to load a file that does not exist from an existing server', () => {
      before(done => execCommand(wrongCmd, () => done()));

      after(() => { connectedToServer = null; });

      it('should connect to the right server', () => assert.isTrue(connectedToServer));

      it('should send a GET to server at wrong URL', () => assert.isTrue(notFound));

      it('should exit with status 1', () => assert.equal(exitStatus, 1));

      it('should print error message to the output', () => {
        assert.include(output, 'Unable to load API description document from');
        assert.include(output, 'Dredd got HTTP 404 response without body');
        assert.include(output, 'not-found.apib');
      });
    });

    describe('and I try to load a file that actually is there', () => {
      before(done => execCommand(goodCmd, () => done()));

      it('should send a GET to the right server', () => assert.isTrue(connectedToServer));

      it('should send a GET to server at good URL', () => assert.isTrue(fileFound));

      it('should exit with status 0', () => assert.equal(exitStatus, 0));
    });
  });
});
