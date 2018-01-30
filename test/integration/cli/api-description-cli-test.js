const fs = require('fs');
const os = require('os');
const {assert} = require('chai');

const {runDreddCommandWithServer, createServer, DEFAULT_SERVER_PORT} = require('../helpers');


const NON_EXISTENT_PORT = DEFAULT_SERVER_PORT + 1;


describe('CLI - API Description Document', function() {

  describe('when loaded from file', function() {

    describe('when loaded by glob pattern', function() {
      let runtimeInfo = undefined;
      const args = ['./test/fixtures/single-g*t.apib', `http://127.0.0.1:${DEFAULT_SERVER_PORT}`];

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

    describe('when file not found', function() {
      let runtimeInfo = undefined;
      const args = [
        './test/fixtures/__non-existent__.apib',
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
      return it('should print error message to stderr', () => assert.include(runtimeInfo.dredd.stderr, 'not found'));
    });

    return describe('when given path exists, but can\'t be read', function() {
      let runtimeInfo = undefined;
      const args = [
        os.homedir(),
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
      return it('should print error message to stderr', () => assert.include(runtimeInfo.dredd.stderr, 'Error when reading file'));
    });
  });


  describe('when loaded from URL', function() {

    describe('when successfully loaded from URL', function() {
      let runtimeInfo = undefined;
      const args = [
        `http://127.0.0.1:${DEFAULT_SERVER_PORT}/single-get.apib`,
        `http://127.0.0.1:${DEFAULT_SERVER_PORT}`
      ];

      beforeEach(function(done) {
        const app = createServer();
        app.get('/single-get.apib', function(req, res) {
          res.type('text/vnd.apiblueprint');
          const stream = fs.createReadStream('./test/fixtures/single-get.apib');
          return stream.pipe(res);
        });
        app.get('/machines', (req, res) => res.json([{type: 'bulldozer', name: 'willy'}]));

        return runDreddCommandWithServer(args, app, function(err, info) {
          runtimeInfo = info;
          return done(err);
        });
      });

      it('should download API Description Document from server', () => assert.equal(runtimeInfo.server.requestCounts['/single-get.apib'], 1));
      it('should request /machines', () => assert.deepEqual(runtimeInfo.server.requestCounts, {'/machines': 1, '/single-get.apib': 1}));
      return it('should exit with status 0', () => assert.equal(runtimeInfo.dredd.exitStatus, 0));
    });

    describe('when URL points to non-existent server', function() {
      let runtimeInfo = undefined;
      const args = [
        `http://127.0.0.1:${NON_EXISTENT_PORT}/single-get.apib`,
        `http://127.0.0.1:${DEFAULT_SERVER_PORT}`
      ];

      beforeEach(function(done) {
        const app = createServer();
        return runDreddCommandWithServer(args, app, function(err, info) {
          runtimeInfo = info;
          return done(err);
        });
      });

      it('should not request server', () => assert.isFalse(runtimeInfo.server.requested));
      it('should exit with status 1', () => assert.equal(runtimeInfo.dredd.exitStatus, 1));
      return it('should print error message to stderr', function() {
        assert.include(runtimeInfo.dredd.stderr, 'Error when loading file from URL');
        assert.include(runtimeInfo.dredd.stderr, 'Is the provided URL correct?');
        return assert.include(runtimeInfo.dredd.stderr, `http://127.0.0.1:${NON_EXISTENT_PORT}/single-get.apib`);
      });
    });

    return describe('when URL points to non-existent resource', function() {
      let runtimeInfo = undefined;
      const args = [
        `http://127.0.0.1:${DEFAULT_SERVER_PORT}/__non-existent__.apib`,
        `http://127.0.0.1:${DEFAULT_SERVER_PORT}`
      ];

      beforeEach(function(done) {
        const app = createServer();
        app.get('/__non-existent__.apib', (req, res) => res.sendStatus(404));

        return runDreddCommandWithServer(args, app, function(err, info) {
          runtimeInfo = info;
          return done(err);
        });
      });

      it('should request server', () => assert.isTrue(runtimeInfo.server.requested));
      it('should exit with status 1', () => assert.equal(runtimeInfo.dredd.exitStatus, 1));
      return it('should print error message to stderr', function() {
        assert.include(runtimeInfo.dredd.stderr, 'Unable to load file from URL');
        assert.include(runtimeInfo.dredd.stderr, 'responded with status code 404');
        return assert.include(runtimeInfo.dredd.stderr, `http://127.0.0.1:${DEFAULT_SERVER_PORT}/__non-existent__.apib`);
      });
    });
  });


  return describe('when loaded by -p/--path', function() {

    describe('when loaded from file', function() {
      let runtimeInfo = undefined;
      const args = [
        './test/fixtures/single-get.apib',
        `http://127.0.0.1:${DEFAULT_SERVER_PORT}`,
        "--path=./test/fixtures/single-get-uri-template.apib"
      ];

      beforeEach(function(done) {
        const app = createServer();
        app.get('/machines', (req, res) => res.json([{type: 'bulldozer', name: 'willy'}]));
        app.get('/machines/willy', (req, res) => res.json({type: 'bulldozer', name: 'willy'}));

        return runDreddCommandWithServer(args, app, function(err, info) {
          runtimeInfo = info;
          return done(err);
        });
      });

      it('should request /machines, /machines/willy', () => assert.deepEqual(runtimeInfo.server.requestCounts, {'/machines': 1, '/machines/willy': 1}));
      return it('should exit with status 0', () => assert.equal(runtimeInfo.dredd.exitStatus, 0));
    });

    describe('when loaded from URL', function() {
      let runtimeInfo = undefined;
      const args = [
        './test/fixtures/single-get-uri-template.apib',
        `http://127.0.0.1:${DEFAULT_SERVER_PORT}`,
        `--path=http://127.0.0.1:${DEFAULT_SERVER_PORT}/single-get.yaml`
      ];

      beforeEach(function(done) {
        const app = createServer();
        app.get('/single-get.yaml', function(req, res) {
          res.type('application/yaml');
          const stream = fs.createReadStream('./test/fixtures/single-get.yaml');
          return stream.pipe(res);
        });
        app.get('/machines', (req, res) => res.json([{type: 'bulldozer', name: 'willy'}]));
        app.get('/machines/willy', (req, res) => res.json({type: 'bulldozer', name: 'willy'}));

        return runDreddCommandWithServer(args, app, function(err, info) {
          runtimeInfo = info;
          return done(err);
        });
      });

      it('should download API Description Document from server', () => assert.equal(runtimeInfo.server.requestCounts['/single-get.yaml'], 1));
      it('should request /machines, /machines/willy', () => assert.deepEqual(runtimeInfo.server.requestCounts, {'/machines': 1, '/machines/willy': 1, '/single-get.yaml': 1}));
      return it('should exit with status 0', () => assert.equal(runtimeInfo.dredd.exitStatus, 0));
    });

    describe('when used multiple times', function() {
      let runtimeInfo = undefined;
      const args = [
        './test/fixtures/single-get.apib',
        `http://127.0.0.1:${DEFAULT_SERVER_PORT}`,
        "--path=./test/fixtures/single-get-uri-template.apib",
        "--path=./test/fixtures/single-get-path.apib"
      ];

      beforeEach(function(done) {
        const app = createServer();
        app.get('/machines', (req, res) => res.json([{type: 'bulldozer', name: 'willy'}]));
        app.get('/machines/willy', (req, res) => res.json({type: 'bulldozer', name: 'willy'}));
        app.get('/machines/caterpillar', (req, res) => res.json({type: 'bulldozer', name: 'caterpillar'}));

        return runDreddCommandWithServer(args, app, function(err, info) {
          runtimeInfo = info;
          return done(err);
        });
      });

      it('should request /machines, /machines/willy, /machines/caterpillar', () => assert.deepEqual(runtimeInfo.server.requestCounts, {'/machines': 1, '/machines/willy': 1, '/machines/caterpillar': 1}));
      return it('should exit with status 0', () => assert.equal(runtimeInfo.dredd.exitStatus, 0));
    });

    describe('when loaded by glob pattern', function() {
      let runtimeInfo = undefined;
      const args = [
        './test/fixtures/single-get.apib',
        `http://127.0.0.1:${DEFAULT_SERVER_PORT}`,
        "--path=./test/fixtures/single-get-uri-temp*.apib"
      ];

      beforeEach(function(done) {
        const app = createServer();
        app.get('/machines', (req, res) => res.json([{type: 'bulldozer', name: 'willy'}]));
        app.get('/machines/willy', (req, res) => res.json({type: 'bulldozer', name: 'willy'}));

        return runDreddCommandWithServer(args, app, function(err, info) {
          runtimeInfo = info;
          return done(err);
        });
      });

      it('should request /machines, /machines/willy', () => assert.deepEqual(runtimeInfo.server.requestCounts, {'/machines': 1, '/machines/willy': 1}));
      return it('should exit with status 0', () => assert.equal(runtimeInfo.dredd.exitStatus, 0));
    });

    return describe('when additional file not found', function() {
      let runtimeInfo = undefined;
      const args = [
        './test/fixtures/single-get.apib',
        `http://127.0.0.1:${DEFAULT_SERVER_PORT}`,
        "--path=./test/fixtures/__non-existent__.apib"
      ];

      beforeEach(function(done) {
        const app = createServer();
        app.get('/machines', (req, res) => res.json([{type: 'bulldozer', name: 'willy'}]));

        return runDreddCommandWithServer(args, app, function(err, info) {
          runtimeInfo = info;
          return done(err);
        });
      });

      it('should not request server', () => assert.isFalse(runtimeInfo.server.requested));
      it('should exit with status 1', () => assert.equal(runtimeInfo.dredd.exitStatus, 1));
      return it('should print error message to stderr', () => assert.include(runtimeInfo.dredd.stderr, 'not found'));
    });
  });
});
