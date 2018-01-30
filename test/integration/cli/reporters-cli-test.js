/* eslint-disable
    no-return-assign,
    no-unused-vars,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.

const fs = require('fs');
const clone = require('clone');
const { assert } = require('chai');

const { runDreddCommand, createServer, DEFAULT_SERVER_PORT } = require('../helpers');


const APIARY_PORT = DEFAULT_SERVER_PORT + 1;


describe('CLI - Reporters', () => {
  let server;
  let serverRuntimeInfo;

  beforeEach((done) => {
    const app = createServer();

    app.get('/machines', (req, res) => res.json([{ type: 'bulldozer', name: 'willy' }]));

    return server = app.listen((err, info) => {
      serverRuntimeInfo = info;
      return done(err);
    });
  });

  afterEach(done => server.close(done));


  describe('when -r/--reporter is provided to use additional reporters', () => {
    let dreddCommandInfo;
    const args = [
      './test/fixtures/single-get.apib',
      `http://127.0.0.1:${DEFAULT_SERVER_PORT}`,
      '--reporter=nyan'
    ];

    beforeEach(done =>
      runDreddCommand(args, (err, info) => {
        dreddCommandInfo = info;
        return done(err);
      })
    );

    return it('should use given reporter', () =>
      // nyan cat ears should exist in stdout
      assert.include(dreddCommandInfo.stdout, '/\\_/\\')
    );
  });


  describe('when apiary reporter is used', () => {
    let apiary;
    let apiaryRuntimeInfo;

    const env = clone(process.env);
    env.APIARY_API_URL = `http://127.0.0.1:${APIARY_PORT}`;

    beforeEach((done) => {
      const app = createServer();

      app.post('/apis/*', (req, res) =>
        res.json({
          _id: '1234_id',
          testRunId: '6789_testRunId',
          reportUrl: 'http://example.com/test/run/1234_id'
        })
      );

      app.all('*', (req, res) => res.json({}));

      return apiary = app.listen(APIARY_PORT, (err, info) => {
        apiaryRuntimeInfo = info;
        return done(err);
      });
    });

    afterEach(done => apiary.close(done));

    describe('when Dredd successfully performs requests to Apiary', () => {
      let dreddCommandInfo;
      let stepRequest;
      const args = [
        './test/fixtures/single-get.apib',
        `http://127.0.0.1:${DEFAULT_SERVER_PORT}`,
        '--reporter=apiary'
      ];

      beforeEach(done =>
        runDreddCommand(args, { env }, (err, info) => {
          dreddCommandInfo = info;
          stepRequest = apiaryRuntimeInfo.requests['/apis/public/tests/steps?testRunId=1234_id'][0];
          return done(err);
        })
      );

      it('should print URL of the test report', () => assert.include(dreddCommandInfo.stdout, 'http://example.com/test/run/1234_id'));
      it('should print warning about missing Apiary API settings', () => assert.include(dreddCommandInfo.stdout, 'Apiary API Key or API Project Subdomain were not provided.'));
      it('should exit with status 0', () => assert.equal(dreddCommandInfo.exitStatus, 0));
      it('should perform 3 requests to Apiary', () =>
        assert.deepEqual(apiaryRuntimeInfo.requestCounts, {
          '/apis/public/tests/runs': 1,
          '/apis/public/tests/run/1234_id': 1,
          '/apis/public/tests/steps?testRunId=1234_id': 1
        }
        )
      );
      return it('should send results from gavel', () => {
        assert.isObject(stepRequest.body);
        assert.nestedProperty(stepRequest.body, 'resultData.request');
        assert.nestedProperty(stepRequest.body, 'resultData.realResponse');
        assert.nestedProperty(stepRequest.body, 'resultData.expectedResponse');
        assert.nestedProperty(stepRequest.body, 'resultData.result.body.validator');
        assert.nestedProperty(stepRequest.body, 'resultData.result.headers.validator');
        return assert.nestedProperty(stepRequest.body, 'resultData.result.statusCode.validator');
      });
    });

    describe('when hooks file uses hooks.log function for logging', () => {
      let dreddCommandInfo;
      let updateRequest;
      let stepRequest;
      const args = [
        './test/fixtures/single-get.apib',
        `http://127.0.0.1:${DEFAULT_SERVER_PORT}`,
        '--reporter=apiary',
        '--hookfiles=./test/fixtures/hooks-log.coffee'
      ];

      beforeEach(done =>
        runDreddCommand(args, { env }, (err, info) => {
          dreddCommandInfo = info;
          updateRequest = apiaryRuntimeInfo.requests['/apis/public/tests/run/1234_id'][0];
          stepRequest = apiaryRuntimeInfo.requests['/apis/public/tests/steps?testRunId=1234_id'][0];
          return done(err);
        })
      );

      it('hooks.log should print also to console', () =>
        // because --level=info is lower than --level=hook
        assert.include(dreddCommandInfo.output, 'using hooks.log to debug')
      );
      it('hooks.log should use toString on objects', () => assert.include(dreddCommandInfo.output, 'Error object!'));
      it('should exit with status 0', () => assert.equal(dreddCommandInfo.exitStatus, 0));

      it('should request Apiary API to start a test run', () => {
        assert.equal(apiaryRuntimeInfo.requestCounts['/apis/public/tests/runs'], 1);
        return assert.equal(apiaryRuntimeInfo.requests['/apis/public/tests/runs'][0].method, 'POST');
      });
      it('should request Apiary API to create a test step', () => {
        assert.equal(apiaryRuntimeInfo.requestCounts['/apis/public/tests/steps?testRunId=1234_id'], 1);
        return assert.equal(apiaryRuntimeInfo.requests['/apis/public/tests/steps?testRunId=1234_id'][0].method, 'POST');
      });
      it('should request Apiary API to update the test run', () => {
        assert.equal(apiaryRuntimeInfo.requestCounts['/apis/public/tests/run/1234_id'], 1);
        return assert.equal(apiaryRuntimeInfo.requests['/apis/public/tests/run/1234_id'][0].method, 'PATCH');
      });

      return context('the update request', () => {
        it('should have result stats with logs', () => {
          assert.isObject(updateRequest.body);
          assert.nestedPropertyVal(updateRequest.body, 'status', 'passed');
          assert.nestedProperty(updateRequest.body, 'endedAt');
          assert.nestedProperty(updateRequest.body, 'logs');
          assert.isArray(updateRequest.body.logs);
          assert.lengthOf(updateRequest.body.logs, 3);
          assert.property(updateRequest.body.logs[0], 'timestamp');
          assert.include(updateRequest.body.logs[0].content, 'Error object!');
          assert.property(updateRequest.body.logs[1], 'timestamp');
          assert.nestedPropertyVal(updateRequest.body.logs[1], 'content', 'true');
          assert.property(updateRequest.body.logs[2], 'timestamp');
          assert.nestedPropertyVal(updateRequest.body.logs[2], 'content', 'using hooks.log to debug');
          assert.nestedProperty(updateRequest.body, 'result.tests');
          assert.nestedProperty(updateRequest.body, 'result.failures');
          assert.nestedProperty(updateRequest.body, 'result.errors');
          assert.nestedProperty(updateRequest.body, 'result.passes');
          assert.nestedProperty(updateRequest.body, 'result.start');
          return assert.nestedProperty(updateRequest.body, 'result.end');
        });
        it('should have startedAt larger than \'before\' hook log timestamp', () => {
          assert.isObject(stepRequest.body);
          assert.isNumber(stepRequest.body.startedAt);
          assert.operator(stepRequest.body.startedAt, '>=', updateRequest.body.logs[0].timestamp);
          return assert.operator(stepRequest.body.startedAt, '>=', updateRequest.body.logs[1].timestamp);
        });
        return it('should have startedAt smaller than \'after\' hook log timestamp', () => {
          assert.isObject(stepRequest.body);
          assert.isNumber(stepRequest.body.startedAt);
          return assert.operator(stepRequest.body.startedAt, '<=', updateRequest.body.logs[2].timestamp);
        });
      });
    });

    return describe('when hooks file uses hooks.log function for logging and hooks are in sandbox mode', () => {
      let dreddCommandInfo;
      let updateRequest;
      let stepRequest;
      const args = [
        './test/fixtures/single-get.apib',
        `http://127.0.0.1:${DEFAULT_SERVER_PORT}`,
        '--reporter=apiary',
        '--level=info',
        '--sandbox',
        '--hookfiles=./test/fixtures/sandboxed-hooks-log.js'
      ];

      beforeEach(done =>
        runDreddCommand(args, { env }, (err, info) => {
          dreddCommandInfo = info;
          updateRequest = apiaryRuntimeInfo.requests['/apis/public/tests/run/1234_id'][0];
          stepRequest = apiaryRuntimeInfo.requests['/apis/public/tests/steps?testRunId=1234_id'][0];
          return done(err);
        })
      );

      it('hooks.log should not print also to console', () => {
        // because we are running in sandboxed mode with higher --level
        assert.notInclude(dreddCommandInfo.output, 'using sandboxed hooks.log');
        return assert.notInclude(dreddCommandInfo.output, 'shall not print');
      });
      it('should exit with status 0', () => assert.equal(dreddCommandInfo.exitStatus, 0));

      it('should request Apiary API to start a test run', () => {
        assert.equal(apiaryRuntimeInfo.requestCounts['/apis/public/tests/runs'], 1);
        return assert.equal(apiaryRuntimeInfo.requests['/apis/public/tests/runs'][0].method, 'POST');
      });
      it('should request Apiary API to create a test step', () => {
        assert.equal(apiaryRuntimeInfo.requestCounts['/apis/public/tests/steps?testRunId=1234_id'], 1);
        return assert.equal(apiaryRuntimeInfo.requests['/apis/public/tests/steps?testRunId=1234_id'][0].method, 'POST');
      });
      it('should request Apiary API to update the test run', () => {
        assert.equal(apiaryRuntimeInfo.requestCounts['/apis/public/tests/run/1234_id'], 1);
        return assert.equal(apiaryRuntimeInfo.requests['/apis/public/tests/run/1234_id'][0].method, 'PATCH');
      });

      return context('the update request', () => {
        it('should have result stats with logs', () => {
          assert.isObject(updateRequest.body);
          assert.nestedPropertyVal(updateRequest.body, 'status', 'passed');
          assert.nestedProperty(updateRequest.body, 'endedAt');
          assert.nestedProperty(updateRequest.body, 'logs');
          assert.isArray(updateRequest.body.logs);
          assert.lengthOf(updateRequest.body.logs, 2);
          assert.property(updateRequest.body.logs[0], 'timestamp');
          assert.nestedPropertyVal(updateRequest.body.logs[0], 'content', 'shall not print, but be present in logs');
          assert.property(updateRequest.body.logs[1], 'timestamp');
          return assert.nestedPropertyVal(updateRequest.body.logs[1], 'content', 'using sandboxed hooks.log');
        });
        it('should have startedAt larger than \'before\' hook log timestamp', () => {
          assert.isObject(stepRequest.body);
          assert.isNumber(stepRequest.body.startedAt);
          return assert.operator(stepRequest.body.startedAt, '>=', updateRequest.body.logs[0].timestamp);
        });
        return it('should have startedAt smaller than \'after\' hook log timestamp', () => {
          assert.isObject(stepRequest.body);
          assert.isNumber(stepRequest.body.startedAt);
          return assert.operator(stepRequest.body.startedAt, '<=', updateRequest.body.logs[1].timestamp);
        });
      });
    });
  });

  describe('when -o/--output is used to specify output file', () => {
    let dreddCommandInfo;
    const args = [
      './test/fixtures/single-get.apib',
      `http://127.0.0.1:${DEFAULT_SERVER_PORT}`,
      '--reporter=xunit',
      '--output=__test_file_output__.xml'
    ];

    beforeEach(done =>
      runDreddCommand(args, (err, info) => {
        dreddCommandInfo = info;
        return done(err);
      })
    );

    afterEach(() => fs.unlinkSync(`${process.cwd()}/__test_file_output__.xml`));

    return it('should create given file', () => assert.isOk(fs.existsSync(`${process.cwd()}/__test_file_output__.xml`)));
  });

  describe('when -o/--output is used multiple times to specify output files', () => {
    let dreddCommandInfo;
    const args = [
      './test/fixtures/single-get.apib',
      `http://127.0.0.1:${DEFAULT_SERVER_PORT}`,
      '--reporter=xunit',
      '--output=__test_file_output1__.xml',
      '--reporter=xunit',
      '--output=__test_file_output2__.xml'
    ];

    beforeEach(done =>
      runDreddCommand(args, (err, info) => {
        dreddCommandInfo = info;
        return done(err);
      })
    );

    afterEach(() => {
      fs.unlinkSync(`${process.cwd()}/__test_file_output1__.xml`);
      return fs.unlinkSync(`${process.cwd()}/__test_file_output2__.xml`);
    });

    return it('should create given files', () => {
      assert.isOk(fs.existsSync(`${process.cwd()}/__test_file_output1__.xml`));
      return assert.isOk(fs.existsSync(`${process.cwd()}/__test_file_output2__.xml`));
    });
  });

  describe('when -o/--output is used to specify output file but directory is not existent', () => {
    let dreddCommandInfo;
    const args = [
      './test/fixtures/single-get.apib',
      `http://127.0.0.1:${DEFAULT_SERVER_PORT}`,
      '--reporter=xunit',
      '--output=./__test_directory/__test_file_output__.xml'
    ];

    beforeEach((done) => {
      try {
        fs.unlinkSync(`${process.cwd()}/__test_directory/__test_file_output__.xml`);
      } catch (error) {}
      // do nothing

      return runDreddCommand(args, (err, info) => {
        dreddCommandInfo = info;
        return done(err);
      });
    });

    afterEach(() => fs.unlinkSync(`${process.cwd()}/__test_directory/__test_file_output__.xml`));

    return it('should create given file', () => assert.isOk(fs.existsSync(`${process.cwd()}/__test_directory/__test_file_output__.xml`)));
  });

  return describe('when the \'apiary\' reporter fails', () => {
    let apiaryApiUrl;
    let dreddCommandInfo;
    const args = [
      './test/fixtures/single-get.apib',
      `http://127.0.0.1:${DEFAULT_SERVER_PORT}`,
      '--reporter=apiary'
    ];

    beforeEach((done) => {
      apiaryApiUrl = process.env.APIARY_API_URL;

      const nonExistentPort = DEFAULT_SERVER_PORT + 42;
      process.env.APIARY_API_URL = `http://127.0.0.1:${nonExistentPort}`;

      return runDreddCommand(args, (err, info) => {
        dreddCommandInfo = info;
        return done(err);
      });
    });
    afterEach(() => process.env.APIARY_API_URL = apiaryApiUrl);

    it('ends successfully', () => assert.equal(dreddCommandInfo.exitStatus, 0));
    return it('prints error about Apiary API connection issues', () => assert.include(dreddCommandInfo.stderr, 'Apiary reporter could not connect to Apiary API'));
  });
});
