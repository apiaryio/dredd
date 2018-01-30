const fs = require('fs');
const {assert} = require('chai');

const {runDreddCommandWithServer, createServer, DEFAULT_SERVER_PORT} = require('../helpers');


describe('CLI - Swagger Document', () =>

  describe('when loaded from file', function() {

    describe('when successfully loaded', function() {
      let runtimeInfo = undefined;
      const args = ['./test/fixtures/single-get.yaml', `http://127.0.0.1:${DEFAULT_SERVER_PORT}`];

      beforeEach(function(done) {
        const app = createServer();
        app.get('/machines', (req, res) => res.json([{type: 'bulldozer', name: 'willy'}]));

        return runDreddCommandWithServer(args, app, function(err, info) {
          runtimeInfo = info;
          return done(err);
        });
      });

      it('should request /machines', () => assert.deepEqual(runtimeInfo.server.requestCounts, {'/machines': 1}));
      return it('should exit with status 0', () => assert.equal(runtimeInfo.dredd.exitStatus, 0));
    });

    describe('when Swagger is loaded with errors', function() {
      let runtimeInfo = undefined;
      const args = [
        './test/fixtures/error-swagger.yaml',
        `http://127.0.0.1:${DEFAULT_SERVER_PORT}`
      ];

      beforeEach(function(done) {
        const app = createServer();
        return runDreddCommandWithServer(args, app, function(err, info) {
          runtimeInfo = info;
          return done(err);
        });
      });

      it('should exit with status 1', () => assert.equal(runtimeInfo.dredd.exitStatus, 1));
      return it('should print error message to stderr', () => assert.include(runtimeInfo.dredd.stderr, 'Error when processing API description'));
    });

    return describe('when Swagger is loaded with warnings', function() {
      let runtimeInfo = undefined;
      const args = [
        './test/fixtures/warning-swagger.yaml',
        `http://127.0.0.1:${DEFAULT_SERVER_PORT}`,
        '--no-color'
      ];

      beforeEach(function(done) {
        const app = createServer();
        app.get('/machines', (req, res) => res.json([{type: 'bulldozer', name: 'willy'}]));

        return runDreddCommandWithServer(args, app, function(err, info) {
          runtimeInfo = info;
          return done(err);
        });
      });

      it('should exit with status 0', () => assert.equal(runtimeInfo.dredd.exitStatus, 0));
      return it('should print warning to stdout', () => assert.include(runtimeInfo.dredd.stdout, 'warn: Parser warning'));
    });
  })
);
