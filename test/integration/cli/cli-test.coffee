{assert} = require('chai')
net = require('net')
{exec} = require('child_process')

{isProcessRunning, killAll, createServer, runDreddCommandWithServer, runDreddCommand, DEFAULT_SERVER_PORT} = require('../helpers')

COFFEE_BIN = 'node_modules/.bin/coffee'
DEFAULT_HOOK_HANDLER_PORT = 61321


describe 'CLI', ->

  describe "Arguments with existing API description document and responding server", ->
    describe "when executing the command and the server is responding as specified in the API description", ->
      runtimeInfo = undefined

      before (done) ->
        app = createServer()
        app.get '/machines', (req, res) ->
          res.json([{type: 'bulldozer', name: 'willy'}])

        args = ['./test/fixtures/single-get.apib', "http://127.0.0.1:#{DEFAULT_SERVER_PORT}"]
        runDreddCommandWithServer(args, app, (err, info) ->
          runtimeInfo = info
          done(err)
        )

      it 'exit status should be 0', ->
        assert.equal runtimeInfo.dredd.exitStatus, 0

    describe "when executing the command and the server is responding as specified in the API description, endpoint with path", ->
      runtimeInfo = undefined

      before (done) ->
        app = createServer()
        app.get '/v2/machines', (req, res) ->
          res.json([{type: 'bulldozer', name: 'willy'}])

        args = ['./test/fixtures/single-get.apib', "http://127.0.0.1:#{DEFAULT_SERVER_PORT}/v2/"]
        runDreddCommandWithServer(args, app, (err, info) ->
          runtimeInfo = info
          done(err)
        )

      it 'exit status should be 0', ->
        assert.equal runtimeInfo.dredd.exitStatus, 0

    describe "when executing the command and the server is sending different response", ->
      runtimeInfo = undefined

      before (done) ->
        app = createServer()
        app.get '/machines', (req, res) ->
          res.status(201).json([{kind: 'bulldozer', imatriculation: 'willy'}])

        args = ['./test/fixtures/single-get.apib', "http://127.0.0.1:#{DEFAULT_SERVER_PORT}"]
        runDreddCommandWithServer(args, app, (err, info) ->
          runtimeInfo = info
          done(err)
        )

      it 'exit status should be 1', ->
        assert.equal runtimeInfo.dredd.exitStatus, 1

  describe "when called with arguments", ->

    describe 'when using language hook handler and spawning the server', ->
      # Some tests are disabled for Windows. There are multiple known issues which
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
      itNotWindows = if process.platform is 'win32' then it.skip else it

      describe "and handler file doesn't exist", ->
        runtimeInfo = undefined

        before (done) ->
          app = createServer()
          app.get '/machines', (req, res) ->
            res.json([{type: 'bulldozer', name: 'willy'}])

          args = [
            './test/fixtures/single-get.apib'
            "http://127.0.0.1:#{DEFAULT_SERVER_PORT}"
            '--server-wait=0'
            '--language=foo/bar/hook-handler'
            '--hookfiles=./test/fixtures/scripts/emptyfile'
          ]
          runDreddCommandWithServer(args, app, (err, info) ->
            runtimeInfo = info
            done(err)
          )

        after (done) ->
          killAll('test/fixtures/scripts/', done)

        it 'should return with status 1', ->
          assert.equal runtimeInfo.dredd.exitStatus, 1

        it 'should not return message containing exited or killed', ->
          assert.notInclude runtimeInfo.dredd.stderr, 'exited'
          assert.notInclude runtimeInfo.dredd.stderr, 'killed'

        it 'should not return message announcing the fact', ->
          assert.include runtimeInfo.dredd.stderr, 'not found'

        it 'should term or kill the server', (done) ->
          isProcessRunning('endless-ignore-term', (err, isRunning) ->
            assert.isFalse isRunning unless err
            done(err)
          )

        it 'should not execute any transaction', ->
          assert.deepEqual runtimeInfo.server.requestCounts, {}

      describe 'and handler crashes before execution', ->
        runtimeInfo = undefined

        before (done) ->
          app = createServer()
          app.get '/machines', (req, res) ->
            res.json([{type: 'bulldozer', name: 'willy'}])

          args = [
            './test/fixtures/single-get.apib'
            "http://127.0.0.1:#{DEFAULT_SERVER_PORT}"
            '--server-wait=0'
            "--language=#{COFFEE_BIN} ./test/fixtures/scripts/exit-3.coffee"
            '--hookfiles=./test/fixtures/scripts/emptyfile'
          ]
          runDreddCommandWithServer(args, app, (err, info) ->
            runtimeInfo = info
            done(err)
          )

        after (done) ->
          killAll('test/fixtures/scripts/', done)

        it 'should return with status 1', ->
          assert.equal runtimeInfo.dredd.exitStatus, 1

        it 'should return message announcing the fact', ->
          assert.include runtimeInfo.dredd.stderr, 'exited'

        itNotWindows 'should term or kill the server', (done) ->
          isProcessRunning('endless-ignore-term', (err, isRunning) ->
            assert.isFalse isRunning unless err
            done(err)
          )

        it 'should not execute any transaction', ->
          assert.deepEqual runtimeInfo.server.requestCounts, {}

      describe "and handler is killed before execution", ->
        runtimeInfo = undefined

        before (done) ->
          app = createServer()
          app.get '/machines', (req, res) ->
            res.json([{type: 'bulldozer', name: 'willy'}])

          args = [
            './test/fixtures/single-get.apib'
            "http://127.0.0.1:#{DEFAULT_SERVER_PORT}"
            "--server=#{COFFEE_BIN} ./test/fixtures/scripts/endless-ignore-term.coffee"
            '--server-wait=0'
            "--language=#{COFFEE_BIN} ./test/fixtures/scripts/kill-self.coffee"
            '--hookfiles=./test/fixtures/scripts/emptyfile'
          ]
          runDreddCommandWithServer(args, app, (err, info) ->
            runtimeInfo = info
            done(err)
          )

        after (done) ->
          killAll('test/fixtures/scripts/', done)

        it 'should return with status 1', ->
          assert.equal runtimeInfo.dredd.exitStatus, 1

        itNotWindows 'should return message announcing the fact', ->
          assert.include runtimeInfo.dredd.stderr, 'killed'

        itNotWindows 'should term or kill the server', (done) ->
          isProcessRunning('endless-ignore-term', (err, isRunning) ->
            assert.isFalse isRunning unless err
            done(err)
          )

        it 'should not execute any transaction', ->
          assert.deepEqual runtimeInfo.server.requestCounts, {}

      describe "and handler is killed during execution", ->
        runtimeInfo = undefined

        before (done) ->
          app = createServer()
          app.get '/machines', (req, res) ->
            killAll('endless-ignore-term.+[^=]foo/bar/hooks', (err) ->
              done err if err
              res.json([{type: 'bulldozer', name: 'willy'}])
            )

          # TCP server echoing transactions back
          hookHandler = net.createServer (socket) ->
            socket.on 'data', (data) -> socket.write data
            socket.on 'error', (err) -> console.error err

          args = [
            './test/fixtures/single-get.apib'
            "http://127.0.0.1:#{DEFAULT_SERVER_PORT}"
            "--server=#{COFFEE_BIN} ./test/fixtures/scripts/endless-ignore-term.coffee"
            '--server-wait=0'
            "--language=#{COFFEE_BIN} ./test/fixtures/scripts/endless-ignore-term.coffee"
            '--hookfiles=foo/bar/hooks'
          ]
          hookHandler.listen DEFAULT_HOOK_HANDLER_PORT, ->
            runDreddCommandWithServer(args, app, (err, info) ->
              hookHandler.close()
              runtimeInfo = info
              done(err)
            )

        after (done) ->
          killAll('test/fixtures/scripts/', done)

        it 'should return with status 1', ->
          assert.equal runtimeInfo.dredd.exitStatus, 1

        itNotWindows 'should return message announcing the fact', ->
          assert.include runtimeInfo.dredd.stderr, 'killed'

        itNotWindows 'should term or kill the server', (done) ->
          isProcessRunning('endless-ignore-term', (err, isRunning) ->
            assert.isFalse isRunning unless err
            done(err)
          )

        it 'should execute the transaction', ->
          assert.deepEqual runtimeInfo.server.requestCounts, {'/machines': 1}

      describe "and handler didn't quit but all Dredd tests were OK", ->
        runtimeInfo = undefined

        before (done) ->
          app = createServer()

          app.get '/machines', (req, res) ->
            res.json([{type: 'bulldozer', name: 'willy'}])

          # TCP server echoing transactions back
          hookHandler = net.createServer (socket) ->
            socket.on 'data', (data) -> socket.write data
            socket.on 'error', (err) -> console.error err

          args = [
            './test/fixtures/single-get.apib'
            "http://127.0.0.1:#{DEFAULT_SERVER_PORT}"
            "--server=#{COFFEE_BIN} ./test/fixtures/scripts/endless-ignore-term.coffee"
            '--server-wait=0'
            "--language=#{COFFEE_BIN} ./test/fixtures/scripts/endless-ignore-term.coffee"
            '--hookfiles=./test/fixtures/scripts/emptyfile'
          ]
          hookHandler.listen DEFAULT_HOOK_HANDLER_PORT, ->
            runDreddCommandWithServer(args, app, (err, info) ->
              hookHandler.close()
              runtimeInfo = info
              done(err)
            )

        after (done) ->
          killAll('test/fixtures/scripts/', done)

        it 'should return with status 0', ->
          assert.equal runtimeInfo.dredd.exitStatus, 0

        it 'should not return any killed or exited message', ->
          assert.notInclude runtimeInfo.dredd.stderr, 'killed'
          assert.notInclude runtimeInfo.dredd.stderr, 'exited'

        itNotWindows 'should kill the handler', (done) ->
          isProcessRunning('dredd-fake-handler', (err, isRunning) ->
            assert.isFalse isRunning unless err
            done(err)
          )

        it 'should kill the server', (done) ->
          isProcessRunning('dredd-fake-server', (err, isRunning) ->
            assert.isFalse isRunning unless err
            done(err)
          )

        it 'should execute some transaction', ->
          assert.deepEqual runtimeInfo.server.requestCounts, {'/machines': 1}

    describe "when adding additional headers with -h", ->
      runtimeInfo = undefined

      before (done) ->
        app = createServer()
        app.get '/machines', (req, res) ->
          res.json([{type: 'bulldozer', name: 'willy'}])

        args = [
          './test/fixtures/single-get.apib'
          "http://127.0.0.1:#{DEFAULT_SERVER_PORT}"
          '-h'
          'Accept:application/json'
        ]
        runDreddCommandWithServer(args, app, (err, info) ->
          runtimeInfo = info
          done(err)
        )

      it 'should have an additional header in the request', ->
        assert.deepPropertyVal runtimeInfo.server.requests['/machines'][0], 'headers.accept', 'application/json'


    describe "when adding basic auth credentials with -u", ->
      runtimeInfo = undefined

      before (done) ->
        app = createServer()
        app.get '/machines', (req, res) ->
          res.json([{type: 'bulldozer', name: 'willy'}])

        args = [
          './test/fixtures/single-get.apib'
          "http://127.0.0.1:#{DEFAULT_SERVER_PORT}"
          '-u'
          'username:password'
        ]
        runDreddCommandWithServer(args, app, (err, info) ->
          runtimeInfo = info
          done(err)
        )

      it 'should have an authorization header in the request', ->
        assert.isOk runtimeInfo.server.requests['/machines'][0].headers.authorization

      it 'should contain a base64 encoded string of the username and password', ->
        assert.isOk runtimeInfo.server.requests['/machines'][0].headers.authorization is 'Basic ' + new Buffer('username:password').toString('base64')


    describe "when sorting requests with -s", ->
      runtimeInfo = undefined

      before (done) ->
        app = createServer()
        app.get '/machines', (req, res) ->
          res.json([{type: 'bulldozer', name: 'willy'}])

        args = [
          './test/fixtures/apiary.apib'
          "http://127.0.0.1:#{DEFAULT_SERVER_PORT}"
          '-s'
        ]
        runDreddCommandWithServer(args, app, (err, info) ->
          runtimeInfo = info
          done(err)
        )

      it 'should perform the POST, GET, PUT, DELETE in order', ->
        assert.isOk runtimeInfo.dredd.stdout.indexOf('POST') < runtimeInfo.dredd.stdout.indexOf('GET') < runtimeInfo.dredd.stdout.indexOf('PUT') < runtimeInfo.dredd.stdout.indexOf('DELETE')

    describe 'when displaying errors inline with -e', ->
      runtimeInfo = undefined

      before (done) ->
        app = createServer()
        app.get '/machines', (req, res) ->
          res.status(201).json([{kind: 'bulldozer', imatriculation: 'willy'}])

        args = [
          './test/fixtures/single-get.apib'
          "http://127.0.0.1:#{DEFAULT_SERVER_PORT}"
          '-e'
        ]
        runDreddCommandWithServer(args, app, (err, info) ->
          runtimeInfo = info
          done(err)
        )

      it 'should display errors inline', ->
        # when displayed inline, a single fail request only creates two "fail:" messages,
        # as opposed to the usual three
        count = runtimeInfo.dredd.stdout.split("fail").length - 2 #says fail in the epilogue
        assert.equal count, 2

    describe 'when showing details for all requests with -d', ->
      runtimeInfo = undefined

      before (done) ->
        app = createServer()
        app.get '/machines', (req, res) ->
          res.json([{type: 'bulldozer', name: 'willy'}])

        args = [
          './test/fixtures/single-get.apib'
          "http://127.0.0.1:#{DEFAULT_SERVER_PORT}"
          '-d'
        ]
        runDreddCommandWithServer(args, app, (err, info) ->
          runtimeInfo = info
          done(err)
        )

      it 'should display details on passing tests', ->
        # the request: block is not shown for passing tests normally
        assert.isOk runtimeInfo.dredd.stdout.indexOf('request') > -1

    describe "when filtering request methods with -m", ->

      describe 'when blocking a request', ->
        runtimeInfo = undefined

        before (done) ->
          app = createServer()
          app.get '/machines', (req, res) ->
            res.json([{type: 'bulldozer', name: 'willy'}])

          args = [
            './test/fixtures/single-get.apib'
            "http://127.0.0.1:#{DEFAULT_SERVER_PORT}"
            '-m',
            'POST'
          ]
          runDreddCommandWithServer(args, app, (err, info) ->
            runtimeInfo = info
            done(err)
          )

        it 'should not send the request request', ->
          assert.deepEqual runtimeInfo.server.requestCounts, {}

      describe 'when not blocking a request', ->
        runtimeInfo = undefined

        before (done) ->
          app = createServer()
          app.get '/machines', (req, res) ->
            res.json([{type: 'bulldozer', name: 'willy'}])

          args = [
            './test/fixtures/single-get.apib'
            "http://127.0.0.1:#{DEFAULT_SERVER_PORT}"
            '-m',
            'GET'
          ]
          runDreddCommandWithServer(args, app, (err, info) ->
            runtimeInfo = info
            done(err)
          )

        it 'should allow the request to go through', ->
          assert.deepEqual runtimeInfo.server.requestCounts, {'/machines': 1}

    describe "when filtering transaction to particular name with -x or --only", ->
      runtimeInfo = undefined

      before (done) ->
        app = createServer()
        app.get '/machines', (req, res) ->
          res.json([{type: 'bulldozer', name: 'willy'}])

        app.get '/message', (req, res) ->
          res.type('text/plain').send "Hello World!\n"

        args = [
          './test/fixtures/single-get.apib'
          "http://127.0.0.1:#{DEFAULT_SERVER_PORT}"
          '--path=./test/fixtures/multifile/*.apib'
          '--only=Message API > /message > GET'
          '--no-color'
        ]
        runDreddCommandWithServer(args, app, (err, info) ->
          runtimeInfo = info
          done(err)
        )

      it 'should notify skipping to the stdout', ->
        assert.include runtimeInfo.dredd.stdout, 'skip: GET /machines'

      it 'should hit the only transaction', ->
        assert.deepEqual runtimeInfo.server.requestCounts, {'/message': 1}

      it 'exit status should be 0', ->
        assert.equal runtimeInfo.dredd.exitStatus, 0

    describe 'when suppressing color with --no-color', ->
      runtimeInfo = undefined

      before (done) ->
        app = createServer()
        app.get '/machines', (req, res) ->
          res.json([{type: 'bulldozer', name: 'willy'}])

        args = [
          './test/fixtures/single-get.apib'
          "http://127.0.0.1:#{DEFAULT_SERVER_PORT}"
          '--no-color'
        ]
        runDreddCommandWithServer(args, app, (err, info) ->
          runtimeInfo = info
          done(err)
        )

      it 'should print without colors', ->
        # if colors are not on, there is no closing color code between
        # the "pass" and the ":"
        assert.include runtimeInfo.dredd.stdout, 'pass:'

    describe 'when suppressing color with --color=false', ->
      runtimeInfo = undefined

      before (done) ->
        app = createServer()
        app.get '/machines', (req, res) ->
          res.json([{type: 'bulldozer', name: 'willy'}])

        args = [
          './test/fixtures/single-get.apib'
          "http://127.0.0.1:#{DEFAULT_SERVER_PORT}"
          '--color=false'
        ]
        runDreddCommandWithServer(args, app, (err, info) ->
          runtimeInfo = info
          done(err)
        )

      it 'should print without colors', ->
        # if colors are not on, there is no closing color code between
        # the "pass" and the ":"
        assert.include runtimeInfo.dredd.stdout, 'pass:'

    describe 'when setting the log output level with -l', ->
      runtimeInfo = undefined

      before (done) ->
        app = createServer()
        app.get '/machines', (req, res) ->
          res.json([{type: 'bulldozer', name: 'willy'}])

        args = [
          './test/fixtures/single-get.apib'
          "http://127.0.0.1:#{DEFAULT_SERVER_PORT}"
          '-l=error'
        ]
        runDreddCommandWithServer(args, app, (err, info) ->
          runtimeInfo = info
          done(err)
        )

      it 'should not display anything', ->
        # at the "error" level, complete should not be shown
        assert.isOk runtimeInfo.dredd.stdout.indexOf('complete') is -1

    describe 'when showing timestamps with -t', ->
      runtimeInfo = undefined

      before (done) ->
        app = createServer()
        app.get '/machines', (req, res) ->
          res.json([{type: 'bulldozer', name: 'willy'}])

        args = [
          './test/fixtures/single-get.apib'
          "http://127.0.0.1:#{DEFAULT_SERVER_PORT}"
          '-t'
        ]
        runDreddCommandWithServer(args, app, (err, info) ->
          runtimeInfo = info
          done(err)
        )

      it 'should display timestamps', ->
        # look for the prefix for cli output with timestamps
        assert.notEqual runtimeInfo.dredd.stdout.indexOf('Z -'), -1

  describe 'when loading hooks with --hookfiles', ->
    runtimeInfo = undefined

    before (done) ->
      app = createServer()
      app.get '/machines', (req, res) ->
        res.json([{type: 'bulldozer', name: 'willy'}])

      args = [
        './test/fixtures/single-get.apib'
        "http://127.0.0.1:#{DEFAULT_SERVER_PORT}"
        '--hookfiles=./test/fixtures/*_hooks.*'
      ]
      runDreddCommandWithServer(args, app, (err, info) ->
        runtimeInfo = info
        done(err)
      )

    it 'should modify the transaction with hooks', ->
      assert.equal runtimeInfo.server.requests['/machines'][0].headers['header'], '123232323'

  describe 'when describing events in hookfiles', ->
    runtimeInfo = undefined

    containsLine = (str, expected) ->
      lines = str.split('\n')
      for line in lines
        if line.indexOf(expected) > -1
          return true
      return false

    before (done) ->
      app = createServer()
      app.get '/machines', (req, res) ->
        res.json([{type: 'bulldozer', name: 'willy'}])

      args = [
        './test/fixtures/single-get.apib'
        "http://127.0.0.1:#{DEFAULT_SERVER_PORT}"
        '--hookfiles=./test/fixtures/*_events.*'
      ]
      runDreddCommandWithServer(args, app, (err, info) ->
        runtimeInfo = info
        done(err)
      )

    it 'should execute the before and after events', ->
      assert.isOk containsLine(runtimeInfo.dredd.stdout, 'hooks.beforeAll'), (runtimeInfo.dredd.stdout)
      assert.isOk containsLine(runtimeInfo.dredd.stdout, 'hooks.afterAll'), (runtimeInfo.dredd.stdout)

  describe 'when describing both hooks and events in hookfiles', ->
    runtimeInfo = undefined

    getResults = (str) ->
      ret = []
      lines = str.split('\n')
      for line in lines
        if line.indexOf('*** ') > -1
          ret.push(line.substr(line.indexOf('*** ') + 4))
      return ret.join(',')

    before (done) ->
      app = createServer()
      app.get '/machines', (req, res) ->
        res.json([{type: 'bulldozer', name: 'willy'}])

      args = [
        './test/fixtures/single-get.apib'
        "http://127.0.0.1:#{DEFAULT_SERVER_PORT}"
        '--hookfiles=./test/fixtures/*_all.*'
      ]
      runDreddCommandWithServer(args, app, (err, info) ->
        runtimeInfo = info
        done(err)
      )

    it 'should execute hooks and events in order', ->
      events = getResults(runtimeInfo.dredd.stdout)
      assert.isOk events is 'beforeAll,before,after,afterAll'

  describe "tests an API description containing an endpoint with schema", ->
    describe "and server is responding in accordance with the schema", ->
      runtimeInfo = undefined

      before (done) ->
        app = createServer()
        app.get '/', (req, res) ->
          res.json(
            data:
              expires: 1234,
              token: 'this should pass since it is a string'
          )

        args = [
          './test/fixtures/schema.apib'
          "http://127.0.0.1:#{DEFAULT_SERVER_PORT}"
        ]
        runDreddCommandWithServer(args, app, (err, info) ->
          runtimeInfo = info
          done(err)
        )

      it 'exit status should be 0 (success)', ->
        assert.equal runtimeInfo.dredd.exitStatus, 0

    describe "and server is NOT responding in accordance with the schema", ->
      runtimeInfo = undefined

      before (done) ->
        app = createServer()
        app.get '/', (req, res) ->
          res.json(
            data:
              expires: 'this should fail since it is a string',
              token: 'this should pass since it is a string'
          )

        args = [
          './test/fixtures/schema.apib'
          "http://127.0.0.1:#{DEFAULT_SERVER_PORT}"
        ]
        runDreddCommandWithServer(args, app, (err, info) ->
          runtimeInfo = info
          done(err)
        )

      it 'exit status should be 1 (failure)', ->
        assert.equal runtimeInfo.dredd.exitStatus, 1

  describe "when API description document path is a glob", ->
    describe "and called with --names options", ->
      dreddCommandInfo = undefined

      before (done) ->
        args = [
          './test/fixtures/multifile/*.apib'
          "http://127.0.0.1:#{DEFAULT_SERVER_PORT}"
          '--names'
        ]
        runDreddCommand(args, (err, info) ->
          dreddCommandInfo = info
          done(err)
        )

      it 'it should include all paths from all API description documents matching the glob', ->
        assert.include dreddCommandInfo.stdout, '> /greeting > GET'
        assert.include dreddCommandInfo.stdout, '> /message > GET'
        assert.include dreddCommandInfo.stdout, '> /name > GET'

      it 'should exit with status 0', ->
        assert.equal dreddCommandInfo.exitStatus, 0

    describe 'and called with hooks', ->
      runtimeInfo = undefined

      before (done) ->
        app = createServer()
        app.get '/name', (req, res) ->
          res.type('text/plain').send "Adam\n"

        app.get '/greeting', (req, res) ->
          res.type('text/plain').send "Howdy!\n"

        app.get '/message', (req, res) ->
          res.type('text/plain').send "Hello World!\n"

        args = [
          './test/fixtures/multifile/*.apib'
          "http://127.0.0.1:#{DEFAULT_SERVER_PORT}"
          '--hookfiles=./test/fixtures/multifile/multifile_hooks.coffee'
        ]
        runDreddCommandWithServer(args, app, (err, info) ->
          runtimeInfo = info
          done(err)
        )

      it 'should eval the hook for each transaction', ->
        assert.include runtimeInfo.dredd.stdout, 'after name'
        assert.include runtimeInfo.dredd.stdout, 'after greeting'
        assert.include runtimeInfo.dredd.stdout, 'after message'

      it 'should exit with status 0', ->
        assert.equal runtimeInfo.dredd.exitStatus, 0, (runtimeInfo.dredd.output)

      it 'server should receive 3 requests', ->
        assert.deepEqual runtimeInfo.server.requestCounts,
          '/name': 1
          '/greeting': 1
          '/message': 1


  describe "when called with additional --path argument which is a glob", ->
    describe "and called with --names options", ->
      dreddCommandInfo = undefined

      before (done) ->
        args = [
          './test/fixtures/multiple-examples.apib'
          "http://127.0.0.1:#{DEFAULT_SERVER_PORT}"
          '--path=./test/fixtures/multifile/*.apib'
          '--names'
        ]
        runDreddCommand(args, (err, info) ->
          dreddCommandInfo = info
          done(err)
        )

      it 'it should include all paths from all API description documents matching all paths and globs', ->
        assert.include dreddCommandInfo.stdout, 'Greeting API > /greeting > GET'
        assert.include dreddCommandInfo.stdout, 'Message API > /message > GET'
        assert.include dreddCommandInfo.stdout, 'Name API > /name > GET'
        assert.include dreddCommandInfo.stdout, 'Machines API > Machines > Machines collection > Get Machines > Example 1'
        assert.include dreddCommandInfo.stdout, 'Machines API > Machines > Machines collection > Get Machines > Example 2'

      it 'should exit with status 0', ->
        assert.equal dreddCommandInfo.exitStatus, 0

  describe "Using sandboxed hooks", ->
    runtimeInfo = undefined

    before (done) ->
      app = createServer()
      app.get '/machines', (req, res) ->
        res.json([{type: 'bulldozer', name: 'willy'}])

      args = [
        './test/fixtures/single-get.apib'
        "http://127.0.0.1:#{DEFAULT_SERVER_PORT}"
        '--sandbox'
        '--hookfiles=./test/fixtures/sandboxed-hook.js'
      ]
      runDreddCommandWithServer(args, app, (err, info) ->
        runtimeInfo = info
        done(err)
      )

    it 'should hit the resource', ->
      assert.deepEqual runtimeInfo.server.requestCounts, {'/machines': 1}

    it 'exit status should be 1', ->
      assert.equal runtimeInfo.dredd.exitStatus, 1

    it 'stdout shoud contain fail message', ->
      assert.include runtimeInfo.dredd.stdout, 'failed in sandboxed hook'

    it 'stdout shoud contain sandbox messagae', ->
      assert.include runtimeInfo.dredd.stdout, 'Loading hook files in sandboxed context'
