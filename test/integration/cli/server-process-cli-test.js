/* eslint-disable
    no-return-assign,
    no-shadow,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
const { assert } = require('chai');

const { isProcessRunning, killAll, runDreddCommand, createServer, DEFAULT_SERVER_PORT } = require('../helpers');


const COFFEE_BIN = 'node_modules/.bin/coffee';
const NON_EXISTENT_PORT = DEFAULT_SERVER_PORT + 1;


describe('CLI - Server Process', () => {
  describe('when specified by URL', () => {
    let server;
    let serverRuntimeInfo;

    beforeEach((done) => {
      const app = createServer();

      app.get('/machines', (req, res) => res.json([{ type: 'bulldozer', name: 'willy' }]));

      app.get('/machines/willy', (req, res) => res.json({ type: 'bulldozer', name: 'willy' }));

      return server = app.listen((err, info) => {
        serverRuntimeInfo = info;
        return done(err);
      });
    });

    afterEach(done => server.close(done));


    describe('when is running', () => {
      let dreddCommandInfo;
      const args = ['./test/fixtures/single-get.apib', `http://127.0.0.1:${DEFAULT_SERVER_PORT}`];

      beforeEach(done =>
        runDreddCommand(args, (err, info) => {
          dreddCommandInfo = info;
          return done(err);
        })
      );

      it('should request /machines', () => assert.deepEqual(serverRuntimeInfo.requestCounts, { '/machines': 1 }));
      it('should exit with status 0', () => assert.equal(dreddCommandInfo.exitStatus, 0));
    });

    describe('when is not running', () => {
      let dreddCommandInfo;
      const args = ['./test/fixtures/apiary.apib', `http://127.0.0.1:${NON_EXISTENT_PORT}`];

      beforeEach(done =>
        runDreddCommand(args, (err, info) => {
          dreddCommandInfo = info;
          return done(err);
        })
      );

      it('should return understandable message', () => assert.include(dreddCommandInfo.stdout, 'Error connecting'));
      it('should report error for all transactions', () => {
        const occurences = (dreddCommandInfo.stdout.match(/Error connecting/g) || []).length;
        assert.equal(occurences, 5);
      });
      it('should return stats', () => assert.include(dreddCommandInfo.stdout, '5 errors'));
      it('should exit with status 1', () => assert.equal(dreddCommandInfo.exitStatus, 1));
    });
  });


  describe('when specified by -g/--server', () => {
    afterEach(done => killAll('test/fixtures/scripts/', done));

    describe('when works as expected', () => {
      let dreddCommandInfo;
      const args = [
        './test/fixtures/single-get.apib',
        `http://127.0.0.1:${DEFAULT_SERVER_PORT}`,
        `--server=${COFFEE_BIN} ./test/fixtures/scripts/dummy-server.coffee ${DEFAULT_SERVER_PORT}`,
        '--server-wait=1'
      ];

      beforeEach(done =>
        runDreddCommand(args, (err, info) => {
          dreddCommandInfo = info;
          return done(err);
        })
      );

      it('should inform about starting server with custom command', () => assert.include(dreddCommandInfo.stdout, 'Starting backend server process with command'));
      it('should redirect server\'s welcome message', () => assert.include(dreddCommandInfo.stdout, `Dummy server listening on port ${DEFAULT_SERVER_PORT}`));
      it('should exit with status 0', () => assert.equal(dreddCommandInfo.exitStatus, 0));
    });

    describe('when it fails to start', () => {
      let dreddCommandInfo;
      const args = [
        './test/fixtures/single-get.apib',
        `http://127.0.0.1:${DEFAULT_SERVER_PORT}`,
        '--server=/foo/bar/baz',
        '--server-wait=1'
      ];

      beforeEach(done =>
        runDreddCommand(args, (err, info) => {
          dreddCommandInfo = info;
          return done(err);
        })
      );

      it('should inform about starting server with custom command', () => assert.include(dreddCommandInfo.stdout, 'Starting backend server process with command'));
      it('should report problem with server process spawn', () => assert.include(dreddCommandInfo.stderr, 'Command to start backend server process failed, exiting Dredd'));
      it('should exit with status 1', () => assert.equal(dreddCommandInfo.exitStatus, 1));
    });

    for (const scenario of [{
      description: 'When crashes before requests',
      apiDescriptionDocument: './test/fixtures/single-get.apib',
      server: `${COFFEE_BIN} test/fixtures/scripts/exit-3.coffee`,
      expectServerBoot: false
    },
    {
      description: 'When crashes during requests',
      apiDescriptionDocument: './test/fixtures/apiary.apib',
      server: `${COFFEE_BIN} test/fixtures/scripts/dummy-server-crash.coffee ${DEFAULT_SERVER_PORT}`,
      expectServerBoot: true
    },
    {
      description: 'When killed before requests',
      apiDescriptionDocument: './test/fixtures/single-get.apib',
      server: `${COFFEE_BIN} test/fixtures/scripts/kill-self.coffee`,
      expectServerBoot: false
    },
    {
      description: 'When killed during requests',
      apiDescriptionDocument: './test/fixtures/apiary.apib',
      server: `${COFFEE_BIN} test/fixtures/scripts/dummy-server-kill.coffee ${DEFAULT_SERVER_PORT}`,
      expectServerBoot: true
    }
    ]) {
      (scenario =>
        describe(scenario.description, () => {
          let dreddCommandInfo;
          const args = [
            scenario.apiDescriptionDocument,
            `http://127.0.0.1:${DEFAULT_SERVER_PORT}`,
            `--server=${scenario.server}`,
            '--server-wait=1'
          ];

          beforeEach(done =>
            runDreddCommand(args, (err, info) => {
              dreddCommandInfo = info;
              return done(err);
            })
          );

          it('should inform about starting server with custom command', () => assert.include(dreddCommandInfo.stdout, 'Starting backend server process with command'));
          if (scenario.expectServerBoot) {
            it('should redirect server\'s boot message', () => assert.include(dreddCommandInfo.stdout, `Dummy server listening on port ${DEFAULT_SERVER_PORT}`));
          }
          it('the server should not be running', done =>
            isProcessRunning('test/fixtures/scripts/', (err, isRunning) => {
              if (!err) { assert.isFalse(isRunning); }
              return done(err);
            })
          );
          it('should report problems with connection to server', () => assert.include(dreddCommandInfo.stderr, 'Error connecting to server'));
          it('should exit with status 1', () => assert.equal(dreddCommandInfo.exitStatus, 1));
        })
      )(scenario);
    }

    describe('when didn\'t terminate and had to be killed by Dredd', () => {
      let dreddCommandInfo;
      const args = [
        './test/fixtures/single-get.apib',
        `http://127.0.0.1:${DEFAULT_SERVER_PORT}`,
        `--server=${COFFEE_BIN} test/fixtures/scripts/dummy-server-ignore-term.coffee ${DEFAULT_SERVER_PORT}`,
        '--server-wait=1',
        '--level=verbose'
      ];

      beforeEach(done =>
        runDreddCommand(args, (err, info) => {
          dreddCommandInfo = info;
          return done(err);
        })
      );

      it('should inform about starting server with custom command', () => assert.include(dreddCommandInfo.stdout, 'Starting backend server process with command'));
      it('should inform about gracefully terminating the server', () => assert.include(dreddCommandInfo.stdout, 'Gracefully terminating the backend server process'));
      it('should redirect server\'s message about ignoring termination', () => assert.include(dreddCommandInfo.stdout, 'ignoring termination'));
      it('should inform about forcefully killing the server', () => assert.include(dreddCommandInfo.stdout, 'Killing the backend server process'));
      it('the server should not be running', done =>
        isProcessRunning('test/fixtures/scripts/', (err, isRunning) => {
          if (!err) { assert.isFalse(isRunning); }
          return done(err);
        })
      );
      it('should exit with status 0', () => assert.equal(dreddCommandInfo.exitStatus, 0));
    });
  });
});
