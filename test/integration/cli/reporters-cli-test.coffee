
fs = require 'fs'
clone = require 'clone'
{assert} = require 'chai'

{runDreddCommand, createServer, DEFAULT_SERVER_PORT} = require '../helpers'


APIARY_PORT = DEFAULT_SERVER_PORT + 1


describe 'CLI - Reporters', ->
  server = undefined
  serverRuntimeInfo = undefined

  beforeEach (done) ->
    app = createServer()

    app.get '/machines', (req, res) ->
      res.send [{type: 'bulldozer', name: 'willy'}]

    server = app.listen (err, info) ->
      serverRuntimeInfo = info
      done(err)

  afterEach (done) ->
    server.close(done)


  describe 'When -r/--reporter is provided to use additional reporters', ->
    dreddCommandInfo = undefined
    args = [
      './test/fixtures/single-get.apib'
      "http://127.0.0.1:#{DEFAULT_SERVER_PORT}"
      '--reporter=nyan'
    ]

    beforeEach (done) ->
      runDreddCommand args, (err, info) ->
        dreddCommandInfo = info
        done(err)

    it 'should use given reporter', ->
      # nyan cat ears should exist in stdout
      assert.include dreddCommandInfo.stdout, '/\\_/\\'


  describe 'When apiary reporter is used', ->
    apiary = undefined
    apiaryRuntimeInfo = undefined

    env = clone process.env
    env.APIARY_API_URL = "http://127.0.0.1:#{APIARY_PORT}"

    beforeEach (done) ->
      app = createServer()

      app.post '/apis/*', (req, res) ->
        res.send
          _id: '1234_id'
          testRunId: '6789_testRunId'
          reportUrl: 'http://example.com/test/run/1234_id'

      app.all '*', (req, res) ->
        res.send {}

      apiary = app.listen APIARY_PORT, (err, info) ->
        apiaryRuntimeInfo = info
        done(err)

    afterEach (done) ->
      apiary.close(done)

    describe 'When Dredd successfully performs requests to Apiary', ->
      dreddCommandInfo = undefined
      stepRequest = undefined
      args = [
        './test/fixtures/single-get.apib'
        "http://127.0.0.1:#{DEFAULT_SERVER_PORT}"
        '--reporter=apiary'
      ]

      beforeEach (done) ->
        runDreddCommand args, {env}, (err, info) ->
          dreddCommandInfo = info
          stepRequest = apiaryRuntimeInfo.requests['/apis/public/tests/steps?testRunId=1234_id'][0]
          done(err)

      it 'should print URL of the test report', ->
        assert.include dreddCommandInfo.stdout, 'http://example.com/test/run/1234_id'
      it 'should print warning about missing Apiary API settings', ->
        assert.include dreddCommandInfo.stdout, 'Apiary API Key or API Project Subdomain were not provided.'
      it 'should exit with status 0', ->
        assert.equal dreddCommandInfo.exitStatus, 0
      it 'should perform 3 requests to Apiary', ->
        assert.deepEqual apiaryRuntimeInfo.requestCounts,
          '/apis/public/tests/runs': 1
          '/apis/public/tests/run/1234_id': 1
          '/apis/public/tests/steps?testRunId=1234_id': 1
      it 'should send results from gavel', ->
        assert.isObject stepRequest.body
        assert.deepProperty stepRequest.body, 'resultData.request'
        assert.deepProperty stepRequest.body, 'resultData.realResponse'
        assert.deepProperty stepRequest.body, 'resultData.expectedResponse'
        assert.deepProperty stepRequest.body, 'resultData.result.body.validator'
        assert.deepProperty stepRequest.body, 'resultData.result.headers.validator'
        assert.deepProperty stepRequest.body, 'resultData.result.statusCode.validator'

    describe 'When hooks file uses hooks.log function for logging', ->
      dreddCommandInfo = undefined
      updateRequest = undefined
      stepRequest = undefined
      args = [
        './test/fixtures/single-get.apib'
        "http://127.0.0.1:#{DEFAULT_SERVER_PORT}"
        '--reporter=apiary'
        '--hookfiles=./test/fixtures/hooks_log.coffee'
      ]

      beforeEach (done) ->
        runDreddCommand args, {env}, (err, info) ->
          dreddCommandInfo = info
          updateRequest = apiaryRuntimeInfo.requests['/apis/public/tests/run/1234_id'][0]
          stepRequest = apiaryRuntimeInfo.requests['/apis/public/tests/steps?testRunId=1234_id'][0]
          done(err)

      it 'hooks.log should print also to console', ->
        # because --level=info is lower than --level=hook
        assert.include dreddCommandInfo.output, 'using hooks.log to debug'
      it 'hooks.log should use toString on objects', ->
        assert.include dreddCommandInfo.output, 'Error object!'
      it 'should exit with status 0', ->
        assert.equal dreddCommandInfo.exitStatus, 0
      it 'should send result stats in PATCH request to Apiary with logs', ->
        assert.isObject updateRequest.body
        assert.deepPropertyVal updateRequest.body, 'status', 'passed'
        assert.deepProperty updateRequest.body, 'endedAt'
        assert.deepProperty updateRequest.body, 'logs'
        assert.isArray updateRequest.body.logs
        assert.lengthOf updateRequest.body.logs, 3
        assert.property updateRequest.body.logs[0], 'timestamp'
        assert.include updateRequest.body.logs[0].content, 'Error object!'
        assert.property updateRequest.body.logs[1], 'timestamp'
        assert.deepPropertyVal updateRequest.body.logs[1], 'content', 'true'
        assert.property updateRequest.body.logs[2], 'timestamp'
        assert.deepPropertyVal updateRequest.body.logs[2], 'content', 'using hooks.log to debug'
        assert.deepProperty updateRequest.body, 'result.tests'
        assert.deepProperty updateRequest.body, 'result.failures'
        assert.deepProperty updateRequest.body, 'result.errors'
        assert.deepProperty updateRequest.body, 'result.passes'
        assert.deepProperty updateRequest.body, 'result.start'
        assert.deepProperty updateRequest.body, 'result.end'
      it 'should send test step with startedAt larger than \'before\' hook log timestamp', ->
        assert.isObject stepRequest.body
        assert.isNumber stepRequest.body.startedAt
        assert.operator stepRequest.body.startedAt, '>=', updateRequest.body.logs[0].timestamp
        assert.operator stepRequest.body.startedAt, '>=', updateRequest.body.logs[1].timestamp
      it 'should send test step with startedAt smaller than \'after\' hook log timestamp', ->
        assert.isObject stepRequest.body
        assert.isNumber stepRequest.body.startedAt
        assert.operator stepRequest.body.startedAt, '<=', updateRequest.body.logs[2].timestamp

    describe 'When hooks file uses hooks.log function for logging and hooks are in sandbox mode', ->
      dreddCommandInfo = undefined
      updateRequest = undefined
      stepRequest = undefined
      args = [
        './test/fixtures/single-get.apib'
        "http://127.0.0.1:#{DEFAULT_SERVER_PORT}"
        '--reporter=apiary'
        '--level=info'
        '--sandbox'
        '--hookfiles=./test/fixtures/sandboxed_hooks_log.js'
      ]

      beforeEach (done) ->
        runDreddCommand args, {env}, (err, info) ->
          dreddCommandInfo = info
          updateRequest = apiaryRuntimeInfo.requests['/apis/public/tests/run/1234_id'][0]
          stepRequest = apiaryRuntimeInfo.requests['/apis/public/tests/steps?testRunId=1234_id'][0]
          done(err)

      it 'hooks.log should not print also to console', ->
        # because we are running in sandboxed mode with higher --level
        assert.notInclude dreddCommandInfo.output, 'using sandboxed hooks.log'
        assert.notInclude dreddCommandInfo.output, 'shall not print'
      it 'should exit with status 0', ->
        assert.equal dreddCommandInfo.exitStatus, 0
      it 'should send result stats in PATCH request to Apiary with logs', ->
        assert.isObject updateRequest.body
        assert.deepPropertyVal updateRequest.body, 'status', 'passed'
        assert.deepProperty updateRequest.body, 'endedAt'
        assert.deepProperty updateRequest.body, 'logs'
        assert.isArray updateRequest.body.logs
        assert.lengthOf updateRequest.body.logs, 2
        assert.property updateRequest.body.logs[0], 'timestamp'
        assert.deepPropertyVal updateRequest.body.logs[0], 'content', 'shall not print, but be present in logs'
        assert.property updateRequest.body.logs[1], 'timestamp'
        assert.deepPropertyVal updateRequest.body.logs[1], 'content', 'using sandboxed hooks.log'
      it 'should send test step with startedAt larger than \'before\' hook log timestamp', ->
        assert.isObject stepRequest.body
        assert.isNumber stepRequest.body.startedAt
        assert.operator stepRequest.body.startedAt, '>=', updateRequest.body.logs[0].timestamp
      it 'should send test step with startedAt smaller than \'after\' hook log timestamp', ->
        assert.isObject stepRequest.body
        assert.isNumber stepRequest.body.startedAt
        assert.operator stepRequest.body.startedAt, '<=', updateRequest.body.logs[1].timestamp


  describe 'When -o/--output is used to specify output file', ->
    dreddCommandInfo = undefined
    args = [
      './test/fixtures/single-get.apib'
      "http://127.0.0.1:#{DEFAULT_SERVER_PORT}"
      '--reporter=junit'
      '--output=__test_file_output__.xml'
    ]

    beforeEach (done) ->
      runDreddCommand args, (err, info) ->
        dreddCommandInfo = info
        done(err)

    afterEach ->
      fs.unlinkSync "#{process.cwd()}/__test_file_output__.xml"

    it 'should create given file', ->
      assert.ok fs.existsSync "#{process.cwd()}/__test_file_output__.xml"


  describe 'When -o/--output is used multiple times to specify output files', ->
    dreddCommandInfo = undefined
    args = [
      './test/fixtures/single-get.apib'
      "http://127.0.0.1:#{DEFAULT_SERVER_PORT}"
      '--reporter=junit'
      '--output=__test_file_output1__.xml'
      '--reporter=junit'
      '--output=__test_file_output2__.xml'
    ]

    beforeEach (done) ->
      runDreddCommand args, (err, info) ->
        dreddCommandInfo = info
        done(err)

    afterEach ->
      fs.unlinkSync "#{process.cwd()}/__test_file_output1__.xml"
      fs.unlinkSync "#{process.cwd()}/__test_file_output2__.xml"

    it 'should create given files', ->
      assert.ok fs.existsSync "#{process.cwd()}/__test_file_output1__.xml"
      assert.ok fs.existsSync "#{process.cwd()}/__test_file_output2__.xml"
