{assert} = require 'chai'

{execDredd, startServer, isProcessRunning, killAll} = require './helpers'


PORT = 8887
PORT_NON_EXISTENT = PORT + 1


describe 'CLI - Server Process', ->

  describe 'When specified by URL', ->
    server = undefined
    configureServer = (app) ->
      app.get '/machines', (req, res) ->
        res.send [{type: 'bulldozer', name: 'willy'}]

      app.get '/machines/willy', (req, res) ->
        res.send {type: 'bulldozer', name: 'willy'}

    beforeEach (done) ->
      startServer configureServer, PORT, (err, serverInfo) ->
        server = serverInfo
        done(err)

    afterEach (done) ->
      server.process.close(done)


    describe 'When is running', ->
      dreddCommand = undefined
      args = ['./test/fixtures/single-get.apib', "http://localhost:#{PORT}"]

      beforeEach (done) ->
        execDredd args, (err, commandInfo) ->
          dreddCommand = commandInfo
          done(err)

      it 'should request /machines', ->
        assert.deepEqual server.requestCounts, {'/machines': 1}
      it 'should exit with status 0', ->
        assert.equal dreddCommand.exitStatus, 0

    describe 'When is not running', ->
      dreddCommand = undefined
      args = ['./test/fixtures/apiary.apib', "http://localhost:#{PORT_NON_EXISTENT}"]

      beforeEach (done) ->
        execDredd args, (err, commandInfo) ->
          dreddCommand = commandInfo
          done(err)

      it 'should return understandable message', ->
        assert.include dreddCommand.stdout, 'Error connecting'
      it 'should report error for all transactions', ->
        occurences = (dreddCommand.stdout.match(/Error connecting/g) or []).length
        assert.equal occurences, 5
      it 'should return stats', ->
        assert.include dreddCommand.stdout, '5 errors'
      it 'should exit with status 1', ->
        assert.equal dreddCommand.exitStatus, 1


  describe 'When specified by -g/--server', ->

    afterEach ->
      killAll()


    describe 'When works as expected', ->
      dreddCommand = undefined
      args = [
        './test/fixtures/single-get.apib'
        "http://localhost:#{PORT}"
        "--server='coffee ./test/fixtures/scripts/dummy-server.coffee #{PORT}'"
        '--server-wait=1'
      ]

      beforeEach (done) ->
        execDredd args, (err, commandInfo) ->
          dreddCommand = commandInfo
          done(err)

      it 'should inform about starting server with custom command', ->
        assert.include dreddCommand.stdout, 'Starting server with command'
      it 'should redirect server\'s welcome message', ->
        assert.include dreddCommand.stdout, "Dummy server listening on port #{PORT}"
      it 'should exit with status 0', ->
        assert.equal dreddCommand.exitStatus, 0


    for scenario in [
        description: 'When crashes before requests'
        apiDescriptionDocument: './test/fixtures/single-get.apib'
        server: './test/fixtures/scripts/exit_3.sh'
        expectServerBoot: false
      ,
        description: 'When crashes during requests'
        apiDescriptionDocument: './test/fixtures/apiary.apib'
        server: "coffee ./test/fixtures/scripts/dummy-server-crash.coffee #{PORT}"
        expectServerBoot: true
      ,
        description: 'When killed before requests'
        apiDescriptionDocument: './test/fixtures/single-get.apib'
        server: './test/fixtures/scripts/kill-self.sh'
        expectServerBoot: false
      ,
        description: 'When killed during requests'
        apiDescriptionDocument: './test/fixtures/apiary.apib'
        server: "coffee ./test/fixtures/scripts/dummy-server-kill.coffee #{PORT}"
        expectServerBoot: true
    ]
      do (scenario) ->
        describe scenario.description, ->
          dreddCommand = undefined
          args = [
            scenario.apiDescriptionDocument
            "http://localhost:#{PORT}"
            "--server='#{scenario.server}'"
            '--server-wait=1'
          ]

          beforeEach (done) ->
            execDredd args, (err, commandInfo) ->
              dreddCommand = commandInfo
              done(err)

          it 'should inform about starting server with custom command', ->
            assert.include dreddCommand.stdout, 'Starting server with command'
          if scenario.expectServerBoot
            it 'should redirect server\'s boot message', ->
              assert.include dreddCommand.stdout, "Dummy server listening on port #{PORT}"
          it 'the server should not be running', ->
            assert.isFalse isProcessRunning scenario.server
          it 'should report problems with connection to server', ->
            assert.include dreddCommand.stderr, 'Error connecting to server'
          it 'should exit with status 1', ->
            assert.equal dreddCommand.exitStatus, 1


    describe 'When didn\'t terminate and had to be killed by Dredd', ->
      dreddCommand = undefined
      args = [
        './test/fixtures/single-get.apib'
        "http://localhost:#{PORT}"
        "--server='coffee ./test/fixtures/scripts/dummy-server-nosigterm.coffee #{PORT}'"
        '--server-wait=1'
      ]

      beforeEach (done) ->
        execDredd args, (err, commandInfo) ->
          dreddCommand = commandInfo
          done(err)

      it 'should inform about starting server with custom command', ->
        assert.include dreddCommand.stdout, 'Starting server with command'
      it 'should inform about sending SIGTERM', ->
        assert.include dreddCommand.stdout, 'Sending SIGTERM to the backend server'
      it 'should redirect server\'s message about ignoring SIGTERM', ->
        assert.include dreddCommand.stdout, 'ignoring sigterm'
      it 'should inform about sending SIGKILL', ->
        assert.include dreddCommand.stdout, 'Killing backend server'
      it 'the server should not be running', ->
        assert.isFalse isProcessRunning scenario.server
      it 'should exit with status 0', ->
        assert.equal dreddCommand.exitStatus, 0
