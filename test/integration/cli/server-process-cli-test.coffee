{assert} = require 'chai'

{isProcessRunning, killAll, runDreddCommand, createServer, DEFAULT_SERVER_PORT} = require '../helpers'


COFFEE_BIN = 'node_modules/.bin/coffee'
NON_EXISTENT_PORT = DEFAULT_SERVER_PORT + 1


describe 'CLI - Server Process', ->

  describe 'When specified by URL', ->
    server = undefined
    serverRuntimeInfo = undefined

    beforeEach (done) ->
      app = createServer()

      app.get '/machines', (req, res) ->
        res.json [{type: 'bulldozer', name: 'willy'}]

      app.get '/machines/willy', (req, res) ->
        res.json {type: 'bulldozer', name: 'willy'}

      server = app.listen (err, info) ->
        serverRuntimeInfo = info
        done(err)

    afterEach (done) ->
      server.close(done)


    describe 'When is running', ->
      dreddCommandInfo = undefined
      args = ['./test/fixtures/single-get.apib', "http://127.0.0.1:#{DEFAULT_SERVER_PORT}"]

      beforeEach (done) ->
        runDreddCommand args, (err, info) ->
          dreddCommandInfo = info
          done(err)

      it 'should request /machines', ->
        assert.deepEqual serverRuntimeInfo.requestCounts, {'/machines': 1}
      it 'should exit with status 0', ->
        assert.equal dreddCommandInfo.exitStatus, 0

    describe 'When is not running', ->
      dreddCommandInfo = undefined
      args = ['./test/fixtures/apiary.apib', "http://127.0.0.1:#{NON_EXISTENT_PORT}"]

      beforeEach (done) ->
        runDreddCommand args, (err, info) ->
          dreddCommandInfo = info
          done(err)

      it 'should return understandable message', ->
        assert.include dreddCommandInfo.stdout, 'Error connecting'
      it 'should report error for all transactions', ->
        occurences = (dreddCommandInfo.stdout.match(/Error connecting/g) or []).length
        assert.equal occurences, 5
      it 'should return stats', ->
        assert.include dreddCommandInfo.stdout, '5 errors'
      it 'should exit with status 1', ->
        assert.equal dreddCommandInfo.exitStatus, 1


  describe 'When specified by -g/--server', ->

    afterEach (done) ->
      killAll('test/fixtures/scripts/', done)

    describe 'When works as expected', ->
      dreddCommandInfo = undefined
      args = [
        './test/fixtures/single-get.apib'
        "http://127.0.0.1:#{DEFAULT_SERVER_PORT}"
        "--server=#{COFFEE_BIN} ./test/fixtures/scripts/dummy-server.coffee #{DEFAULT_SERVER_PORT}"
        '--server-wait=1'
      ]

      beforeEach (done) ->
        runDreddCommand args, (err, info) ->
          dreddCommandInfo = info
          done(err)

      it 'should inform about starting server with custom command', ->
        assert.include dreddCommandInfo.stdout, 'Starting backend server process with command'
      it 'should redirect server\'s welcome message', ->
        assert.include dreddCommandInfo.stdout, "Dummy server listening on port #{DEFAULT_SERVER_PORT}"
      it 'should exit with status 0', ->
        assert.equal dreddCommandInfo.exitStatus, 0


    for scenario in [
        description: 'When crashes before requests'
        apiDescriptionDocument: './test/fixtures/single-get.apib'
        server: "#{COFFEE_BIN} test/fixtures/scripts/exit-3.coffee"
        expectServerBoot: false
      ,
        description: 'When crashes during requests'
        apiDescriptionDocument: './test/fixtures/apiary.apib'
        server: "#{COFFEE_BIN} test/fixtures/scripts/dummy-server-crash.coffee #{DEFAULT_SERVER_PORT}"
        expectServerBoot: true
      ,
        description: 'When killed before requests'
        apiDescriptionDocument: './test/fixtures/single-get.apib'
        server: "#{COFFEE_BIN} test/fixtures/scripts/kill-self.coffee"
        expectServerBoot: false
      ,
        description: 'When killed during requests'
        apiDescriptionDocument: './test/fixtures/apiary.apib'
        server: "#{COFFEE_BIN} test/fixtures/scripts/dummy-server-kill.coffee #{DEFAULT_SERVER_PORT}"
        expectServerBoot: true
    ]
      do (scenario) ->
        describe scenario.description, ->
          dreddCommandInfo = undefined
          args = [
            scenario.apiDescriptionDocument
            "http://127.0.0.1:#{DEFAULT_SERVER_PORT}"
            "--server=#{scenario.server}"
            '--server-wait=1'
          ]

          beforeEach (done) ->
            runDreddCommand args, (err, info) ->
              dreddCommandInfo = info
              done(err)

          it 'should inform about starting server with custom command', ->
            assert.include dreddCommandInfo.stdout, 'Starting backend server process with command'
          if scenario.expectServerBoot
            it 'should redirect server\'s boot message', ->
              assert.include dreddCommandInfo.stdout, "Dummy server listening on port #{DEFAULT_SERVER_PORT}"
          it 'the server should not be running', (done) ->
            isProcessRunning('test/fixtures/scripts/', (err, isRunning) ->
              assert.isFalse isRunning unless err
              done(err)
            )
          it 'should report problems with connection to server', ->
            assert.include dreddCommandInfo.stderr, 'Error connecting to server'
          it 'should exit with status 1', ->
            assert.equal dreddCommandInfo.exitStatus, 1

    # This test is disabled for Windows. There are multiple known issues which
    # need to be addressed:
    #
    # *  Windows do not support graceful termination of command-line processes
    #    or not in a simple way. CLI process can be only forefully killed, by
    #    default. Thus the functionality around SIGTERM needs to be either
    #    marked as unsupported or some special handling needs to be introduced.
    #
    # *  Killing a process on Windows requires a bit smarter approach then just
    #    calling process.kill(), which is what Dredd does as of now. For that
    #    reason, Dredd isn't able to effectively kill a process on Windows.
    describeNotWindows = if process.platform is 'win32' then describe.skip else describe
    describeNotWindows 'When didn\'t terminate and had to be killed by Dredd', ->
      dreddCommandInfo = undefined
      args = [
        './test/fixtures/single-get.apib'
        "http://127.0.0.1:#{DEFAULT_SERVER_PORT}"
        "--server=#{COFFEE_BIN} test/fixtures/scripts/dummy-server-ignore-term.coffee #{DEFAULT_SERVER_PORT}"
        '--server-wait=1'
      ]

      beforeEach (done) ->
        runDreddCommand args, (err, info) ->
          dreddCommandInfo = info
          done(err)

      it 'should inform about starting server with custom command', ->
        assert.include dreddCommandInfo.stdout, 'Starting backend server process with command'
      it 'should inform about sending SIGTERM', ->
        assert.include dreddCommandInfo.stdout, 'Gracefully terminating backend server process'
      it 'should redirect server\'s message about ignoring termination', ->
        assert.include dreddCommandInfo.stdout, 'ignoring termination'
      it 'should inform about sending SIGKILL', ->
        assert.include dreddCommandInfo.stdout, 'Killing backend server process'
      it 'the server should not be running', (done) ->
        isProcessRunning('test/fixtures/scripts/', (err, isRunning) ->
          assert.isFalse isRunning unless err
          done(err)
        )
      it 'should exit with status 0', ->
        assert.equal dreddCommandInfo.exitStatus, 0
