{assert} = require('chai')
{exec} = require('child_process')
express = require 'express'
clone = require 'clone'
bodyParser = require 'body-parser'
fs = require 'fs'
syncExec = require 'sync-exec'
net = require 'net'

{DREDD_BIN, isProcessRunning} = require './helpers'


PORT = 8887
CMD_PREFIX = ''

stderr = ''
stdout = ''
exitStatus = null
requests = []


execCommand = (cmd, options = {}, callback) ->
  stderr = ''
  stdout = ''
  exitStatus = null

  if typeof options is 'function'
    callback = options
    options = undefined

  cli = exec CMD_PREFIX + cmd, options, (error, out, err) ->
    stdout = out
    stderr = err

    if error
      exitStatus = error.code

  cli.on 'close', (code) ->
    exitStatus = code if exitStatus == null and code != undefined
    callback(undefined, stdout, stderr, exitStatus)


describe 'CLI', () ->

  describe "Arguments with existing blueprint and responding server", () ->
    describe "when executing the command and the server is responding as specified in the blueprint", () ->

      before (done) ->
        cmd = "#{DREDD_BIN} ./test/fixtures/single-get.apib http://localhost:#{PORT}"

        app = express()

        app.get '/machines', (req, res) ->
          res.setHeader 'Content-Type', 'application/json'
          machine =
            type: 'bulldozer'
            name: 'willy'
          response = [machine]
          res.status(200).send response

        server = app.listen PORT, () ->
          execCommand cmd, () ->
            server.close()

        server.on 'close', done

      it 'exit status should be 0', () ->
        assert.equal exitStatus, 0

    describe "when executing the command and the server is responding as specified in the blueprint, endpoint with path", () ->
      before (done) ->
        cmd = "#{DREDD_BIN} ./test/fixtures/single-get.apib http://localhost:#{PORT}/v2/"

        app = express()

        app.get '/v2/machines', (req, res) ->
          res.setHeader 'Content-Type', 'application/json'
          machine =
            type: 'bulldozer'
            name: 'willy'
          response = [machine]
          res.status(200).send response

        server = app.listen PORT, () ->
          execCommand cmd, () ->
            server.close()

        server.on 'close', done

      it 'exit status should be 0', () ->
        assert.equal exitStatus, 0

    describe "when executing the command and the server is sending different response", () ->
      before (done) ->
        cmd = "#{DREDD_BIN} ./test/fixtures/single-get.apib http://localhost:#{PORT}"

        app = express()

        app.get '/machines', (req, res) ->
          res.setHeader 'Content-Type', 'application/json'
          machine =
            kind: 'bulldozer'
            imatriculation: 'willy'
          response = [machine]
          res.status(201).send response

        server = app.listen PORT, () ->
          execCommand cmd, () ->
            server.close()

        server.on 'close', done

      it 'exit status should be 1', () ->
        assert.equal exitStatus, 1

  describe "when called with arguments", () ->

    describe 'when using language hook handler and spawning the server', () ->

      describe "and handler file doesn't exist", () ->
        apiHit = false

        before (done) ->
          languageCmd = "./foo/bar.sh"
          hookfiles = "./test/fixtures/scripts/emptyfile"
          cmd = "#{DREDD_BIN} ./test/fixtures/single-get.apib http://localhost:#{PORT} --no-color --language #{languageCmd} --hookfiles #{hookfiles} --server-wait 0"
          app = express()

          app.get '/machines', (req, res) ->
            apiHit = true

            res.setHeader 'Content-Type', 'application/json'
            machine =
              type: 'bulldozer'
              name: 'willy'
            response = [machine]

            res.status(200).send response

          server = app.listen PORT, () ->
            execCommand cmd, () ->
              server.close()

          server.on 'close', done

        after () ->
          syncExec "ps aux | grep test/fixtures/scripts/ | grep -v grep | awk '{print $2}' | xargs kill -9"

        it 'should return with status 1', () ->
          assert.equal exitStatus, 1

        it 'should not return message containing exited or killed', () ->
          assert.notInclude stderr, 'exited'
          assert.notInclude stderr, 'killed'

        it 'should not return message announcing the fact', () ->
          assert.include stderr, 'not found'

        it 'should term or kill the server', () ->
          assert.isFalse isProcessRunning("endless-nosigterm")

        it 'should not execute any transaction', () ->
          assert.isFalse apiHit

      describe 'and handler crashes before execution', () ->
        apiHit = false

        before (done) ->
          languageCmd = "./test/fixtures/scripts/exit_3.sh"
          hookfiles = "./test/fixtures/scripts/emptyfile"
          cmd = "#{DREDD_BIN} ./test/fixtures/single-get.apib http://localhost:#{PORT} --no-color --language #{languageCmd} --hookfiles #{hookfiles} --server-wait 0"
          app = express()

          app.get '/machines', (req, res) ->
            apiHit = true

            res.setHeader 'Content-Type', 'application/json'
            machine =
              type: 'bulldozer'
              name: 'willy'
            response = [machine]

            res.status(200).send response

          server = app.listen PORT, () ->
            execCommand cmd, () ->
              server.close()

          server.on 'close', done

        after () ->
          syncExec "ps aux | grep test/fixtures/scripts/ | grep -v grep | awk '{print $2}' | xargs kill -9"

        it 'should return with status 1', () ->
          assert.equal exitStatus, 1

        it 'should return message announcing the fact', () ->
          assert.include stderr, 'exited'

        it 'should term or kill the server', () ->
          assert.isFalse isProcessRunning("endless-nosigterm")

        it 'should not execute any transaction', () ->
          assert.isFalse apiHit

      describe "and handler is killed before execution", () ->
        apiHit = false

        before (done) ->
          serverCmd = "./test/fixtures/scripts/endless-nosigterm.sh"
          languageCmd = "./test/fixtures/scripts/kill-self.sh"
          hookFiles = "./test/fixtures/scripts/emptyfile"
          cmd = "#{DREDD_BIN} ./test/fixtures/single-get.apib http://localhost:#{PORT} --no-color --server #{serverCmd} --language #{languageCmd} --hookfiles #{hookFiles} --server-wait 0"

          app = express()

          app.get '/machines', (req, res) ->
            apiHit = true

            res.setHeader 'Content-Type', 'application/json'
            machine =
              type: 'bulldozer'
              name: 'willy'
            response = [machine]
            res.status(200).send response

          server = app.listen PORT, () ->
            execCommand cmd, () ->
              server.close()

          server.on 'close', () ->
            done()

        after () ->
          syncExec "ps aux | grep test/fixtures/scripts/ | grep -v grep | awk '{print $2}' | xargs kill -9"

        it 'should return with status 1', () ->
          assert.equal exitStatus, 1

        it 'should return message announcing the fact', () ->
          assert.include stderr, 'killed'

        it 'should term or kill the server', () ->
          assert.isFalse isProcessRunning("endless-nosigterm")

        it 'should not execute any transaction', () ->
          assert.isFalse apiHit


      describe "and handler is killed during execution", () ->
        apiHit = false

        before (done) ->
          serverCmd = "./test/fixtures/scripts/endless-nosigterm.sh"
          languageCmd = "./test/fixtures/scripts/endless-nosigterm.sh"
          hookFiles = "./test/fixtures/scripts/hooks-kill-after-all.coffee"
          cmd = "#{DREDD_BIN} ./test/fixtures/single-get.apib http://localhost:#{PORT} --no-color --server #{serverCmd} --language #{languageCmd} --hookfiles #{hookFiles} --server-wait 0"

          killHandlerCmd = 'ps aux | grep "bash" | grep "endless-nosigterm.sh" | grep -v grep | awk \'{print $2}\' | xargs kill -9'

          app = express()

          app.get '/machines', (req, res) ->
            apiHit = true

            res.setHeader 'Content-Type', 'application/json'
            machine =
              type: 'bulldozer'
              name: 'willy'
            response = [machine]

            exec killHandlerCmd, (error, stdout, stderr) ->
              done error if error
              res.status(200).send response

          # TCP server echoing transactions back
          hookServer = net.createServer (socket) ->

            socket.on 'data', (data) ->
              socket.write data

          hookServer.listen 61321, () ->
            server = app.listen PORT, () ->
              execCommand cmd, () ->
                server.close()

            server.on 'close', () ->
              hookServer.close()
              done()

        after () ->
          syncExec "ps aux | grep test/fixtures/scripts/ | grep -v grep | awk '{print $2}' | xargs kill -9"

        it 'should return with status 1', () ->
          assert.equal exitStatus, 1

        it 'should return message announcing the fact', () ->
          assert.include stderr, 'killed'

        it 'should term or kill the server', () ->
          assert.isFalse isProcessRunning("endless-nosigterm")

        it 'should execute the transaction', () ->
          assert.isTrue apiHit

      describe "and handler didn't quit but all Dredd tests were OK", () ->
        apiHit = false

        before (done) ->
          serverCmd = "./test/fixtures/scripts/endless-nosigterm.sh"
          languageCmd = "./test/fixtures/scripts/endless-nosigterm.sh"
          hookFiles = "./test/fixtures/scripts/emptyfile"
          cmd = "#{DREDD_BIN} ./test/fixtures/single-get.apib http://localhost:#{PORT} --no-color --server '#{serverCmd}' --language '#{languageCmd}' --hookfiles #{hookFiles} --server-wait 0"

          app = express()

          app.get '/machines', (req, res) ->
            apiHit = true
            res.setHeader 'Content-Type', 'application/json'
            machine =
              type: 'bulldozer'
              name: 'willy'
            response = [machine]
            res.status(200).send response

          # TCP server echoing transactions back
          hookServer = net.createServer (socket) ->

            socket.on 'data', (data) ->
              socket.write data

          hookServer.listen 61321, () ->
            server = app.listen PORT, () ->
              execCommand cmd, () ->
                server.close()

            server.on 'close', () ->
              hookServer.close()
              done()

        after () ->
          syncExec "ps aux | grep test/fixtures/scripts/ | grep -v grep | awk '{print $2}' | xargs kill -9"

        it 'should return with status 0', () ->
          assert.equal exitStatus, 0

        it 'should not return any killed or exited message', () ->
          assert.notInclude stderr, 'killed'
          assert.notInclude stderr, 'exited'

        it 'should kill the handler', () ->
          assert.isFalse isProcessRunning "dredd-fake-handler"

        it 'should kill the server', () ->
          assert.isFalse isProcessRunning "dredd-fake-server"

        it 'should execute some transaction', () ->
          assert.isTrue apiHit


    describe "when adding additional headers with -h", () ->

      receivedRequest = {}

      before (done) ->
        cmd = "#{DREDD_BIN} ./test/fixtures/single-get.apib http://localhost:#{PORT} -h Accept:application/json"

        app = express()

        app.get '/machines', (req, res) ->
          receivedRequest = req
          res.setHeader 'Content-Type', 'application/json'
          machine =
            type: 'bulldozer'
            name: 'willy'
          response = [machine]
          res.status(200).send response

        server = app.listen PORT, () ->
          execCommand cmd, () ->
            server.close()

        server.on 'close', done

      it 'should have an additional header in the request', () ->
        assert.deepPropertyVal receivedRequest, 'headers.accept', 'application/json'


    describe "when adding basic auth credentials with -u", () ->

      receivedRequest = {}

      before (done) ->
        cmd = "#{DREDD_BIN} ./test/fixtures/single-get.apib http://localhost:#{PORT} -u username:password"

        app = express()

        app.get '/machines', (req, res) ->
          receivedRequest = req
          res.setHeader 'Content-Type', 'application/json'
          machine =
            type: 'bulldozer'
            name: 'willy'
          response = [machine]
          res.status(200).send response

        server = app.listen PORT, () ->
          execCommand cmd, () ->
            server.close()

        server.on 'close', done

      it 'should have an authorization header in the request', () ->
        assert.ok receivedRequest.headers.authorization

      it 'should contain a base64 encoded string of the username and password', () ->
        assert.ok receivedRequest.headers.authorization is 'Basic ' + new Buffer('username:password').toString('base64')


    describe "when sorting requests with -s", () ->
      before (done) ->
        cmd = "#{DREDD_BIN} ./test/fixtures/apiary.apib http://localhost:#{PORT} -s"

        app = express()

        app.get '/machines', (req, res) ->
          res.setHeader 'Content-Type', 'application/json'
          machine =
            type: 'bulldozer'
            name: 'willy'
          response = [machine]
          res.status(200).send response

        server = app.listen PORT, () ->
          execCommand cmd, () ->
            server.close()

        server.on 'close', done

      it 'should perform the POST, GET, PUT, DELETE in order', () ->
        assert.ok stdout.indexOf('POST') < stdout.indexOf('GET') < stdout.indexOf('PUT') < stdout.indexOf('DELETE')

    describe 'when displaying errors inline with -e', () ->

      before (done) ->
        cmd = "#{DREDD_BIN} ./test/fixtures/single-get.apib http://localhost:#{PORT} -e"

        app = express()

        app.get '/machines', (req, res) ->
          res.setHeader 'Content-Type', 'application/json'
          machine =
            kind: 'bulldozer'
            imatriculation: 'willy'
          response = [machine]
          res.status(201).send response

        server = app.listen PORT, () ->
          execCommand cmd, () ->
            server.close()

        server.on 'close', done

      it 'should display errors inline', () ->
        # when displayed inline, a single fail request only creates two "fail:" messages,
        # as opposed to the usual three
        count = stdout.split("fail").length - 2 #says fail in the epilogue
        assert.equal count, 2

    describe 'when showing details for all requests with -d', () ->
      before (done) ->
        cmd = "#{DREDD_BIN} ./test/fixtures/single-get.apib http://localhost:#{PORT} -d"

        app = express()

        app.get '/machines', (req, res) ->
          res.setHeader 'Content-Type', 'application/json'
          machine =
            type: 'bulldozer'
            name: 'willy'
          response = [machine]
          res.status(200).send response

        server = app.listen PORT, () ->
          execCommand cmd, () ->
            server.close()

        server.on 'close', done

      it 'should display details on passing tests', () ->
        # the request: block is not shown for passing tests normally
        assert.ok stdout.indexOf('request') > -1

    describe "when filtering request methods with -m", () ->

      describe 'when blocking a request', () ->

        receivedRequest = {}

        before (done) ->
          cmd = "#{DREDD_BIN} ./test/fixtures/single-get.apib http://localhost:#{PORT} -m POST"

          app = express()

          app.get '/machines', (req, res) ->
            receivedRequest = req
            res.setHeader 'Content-Type', 'application/json'
            machine =
              type: 'bulldozer'
              name: 'willy'
            response = [machine]
            res.status(200).send response

          server = app.listen PORT, () ->
            execCommand cmd, () ->
              server.close()

          server.on 'close', done

        it 'should not send the request request', () ->
          assert.deepEqual receivedRequest, {}

      describe 'when not blocking a request', () ->

        receivedRequest = {}

        before (done) ->
          cmd = "#{DREDD_BIN} ./test/fixtures/single-get.apib http://localhost:#{PORT} -m GET"

          app = express()

          app.get '/machines', (req, res) ->
            receivedRequest = req
            res.setHeader 'Content-Type', 'application/json'
            machine =
              type: 'bulldozer'
              name: 'willy'
            response = [machine]
            res.status(200).send response

          server = app.listen PORT, () ->
            execCommand cmd, () ->
              server.close()

          server.on 'close', done

        it 'should allow the request to go through', () ->
          assert.ok receivedRequest.headers

    describe "when filtering transaction to particular name with -x or --only", () ->

      machineHit = false
      messageHit = false
      before (done) ->
        cmd = "#{DREDD_BIN} ./test/fixtures/single-get.apib http://localhost:#{PORT} --path=./test/fixtures/multifile/*.apib --only=\"Message API > /message > GET\" --no-color"

        app = express()

        app.get '/machines', (req, res) ->
          machineHit = true
          res.setHeader 'Content-Type', 'application/json; charset=utf-8'
          machine =
            type: 'bulldozer'
            name: 'willy'
          response = [machine]
          res.status(200).send response

        app.get '/message', (req, res) ->
          messageHit = true
          res.setHeader 'Content-Type', 'text/plain; charset=utf-8'
          res.status(200).send "Hello World!\n"

        server = app.listen PORT, () ->
          execCommand cmd, () ->
            server.close()

        server.on 'close', done

      it 'should not send the request', () ->
        assert.isFalse machineHit

      it 'should notify skipping to the stdout', () ->
        assert.include stdout, 'skip: GET /machines'

      it 'should hit the only transaction', () ->
        assert.isTrue messageHit

      it 'exit status should be 0', () ->
        assert.equal exitStatus, 0

    describe 'when suppressing color with --no-color', () ->
      before (done) ->
        cmd = "#{DREDD_BIN} ./test/fixtures/single-get.apib http://localhost:#{PORT} --no-color"

        app = express()

        app.get '/machines', (req, res) ->
          res.setHeader 'Content-Type', 'application/json'
          machine =
            type: 'bulldozer'
            name: 'willy'
          response = [machine]
          res.status(200).send response

        server = app.listen PORT, () ->
          execCommand cmd, () ->
            server.close()

        server.on 'close', done

      it 'should print without colors', () ->
        # if colors are not on, there is no closing color code between
        # the "pass" and the ":"
        assert.include stdout, 'pass:'

    describe 'when suppressing color with --color false', () ->
      before (done) ->
        cmd = "#{DREDD_BIN} ./test/fixtures/single-get.apib http://localhost:#{PORT} --color false"

        app = express()

        app.get '/machines', (req, res) ->
          res.setHeader 'Content-Type', 'application/json'
          machine =
            type: 'bulldozer'
            name: 'willy'
          response = [machine]
          res.status(200).send response

        server = app.listen PORT, () ->
          execCommand cmd, () ->
            server.close()

        server.on 'close', done

      it 'should print without colors', () ->
        # if colors are not on, there is no closing color code between
        # the "pass" and the ":"
        assert.include stdout, 'pass:'

    describe 'when setting the log output level with -l', () ->
      before (done) ->
        cmd = "#{DREDD_BIN} ./test/fixtures/single-get.apib http://localhost:#{PORT} -l=error"

        app = express()

        app.get '/machines', (req, res) ->
          res.setHeader 'Content-Type', 'application/json'
          machine =
            type: 'bulldozer'
            name: 'willy'
          response = [machine]
          res.status(200).send response

        server = app.listen PORT, () ->
          execCommand cmd, () ->
            server.close()

        server.on 'close', done

      it 'should not display anything', () ->
        # at the "error" level, complete should not be shown
        assert.ok stdout.indexOf('complete') is -1

    describe 'when showing timestamps with -t', () ->
      before (done) ->
        cmd = "#{DREDD_BIN} ./test/fixtures/single-get.apib http://localhost:#{PORT} -t"

        app = express()

        app.get '/machines', (req, res) ->
          res.setHeader 'Content-Type', 'application/json'
          machine =
            type: 'bulldozer'
            name: 'willy'
          response = [machine]
          res.status(200).send response

        server = app.listen PORT, () ->
          execCommand cmd, () ->
            server.close()

        server.on 'close', done

      it 'should display timestamps', () ->
        # look for the prefix for cli output with timestamps
        assert.notEqual stdout.indexOf('Z -'), -1

  describe 'when loading hooks with --hookfiles', () ->

    receivedRequest = {}

    before (done) ->
      cmd = "#{DREDD_BIN} ./test/fixtures/single-get.apib http://localhost:#{PORT} --hookfiles=./test/fixtures/*_hooks.*"

      app = express()

      app.get '/machines', (req, res) ->
        receivedRequest = req
        res.setHeader 'Content-Type', 'application/json'
        machine =
          type: 'bulldozer'
          name: 'willy'
        response = [machine]
        res.status(200).send response

      server = app.listen PORT, () ->
        execCommand cmd, () ->
          server.close()

      server.on 'close', done

    it 'should modify the transaction with hooks', () ->
      assert.equal receivedRequest.headers['header'], '123232323'

  describe 'when describing events in hookfiles', () ->
    output = {}
    containsLine = (str, expected) ->
      lines = str.split('\n')
      for line in lines
        if line.indexOf(expected) > -1
          return true
      return false

    before (done) ->
      cmd = "#{DREDD_BIN} ./test/fixtures/single-get.apib http://localhost:#{PORT} --hookfiles=./test/fixtures/*_events.*"

      app = express()

      app.get '/machines', (req, res) ->
        res.setHeader 'Content-Type', 'application/json'
        machine =
          type: 'bulldozer'
          name: 'willy'
        response = [machine]
        res.status(200).send response

      server = app.listen PORT, () ->
        execCommand cmd, (err, stdout, stderr) ->
          output.stdout = stdout
          output.stderr = stderr
          server.close()

      server.on 'close', done

    it 'should execute the before and after events', () ->
      assert.ok containsLine(output.stdout, 'hooks.beforeAll'), (stdout)
      assert.ok containsLine(output.stdout, 'hooks.afterAll'), (stdout)

  describe 'when describing both hooks and events in hookfiles', () ->
    output = {}
    getResults = (str) ->
      ret = []
      lines = str.split('\n')
      for line in lines
        if line.indexOf('*** ') > -1
          ret.push(line.substr(line.indexOf('*** ') + 4))
      return ret.join(',')

    before (done) ->
      cmd = "#{DREDD_BIN} ./test/fixtures/single-get.apib http://localhost:#{PORT} --hookfiles=./test/fixtures/*_all.*"

      app = express()

      app.get '/machines', (req, res) ->
        res.setHeader 'Content-Type', 'application/json'
        machine =
          type: 'bulldozer'
          name: 'willy'
        response = [machine]
        res.status(200).send response

      server = app.listen PORT, () ->
        execCommand cmd, (err, stdout, stderr) ->
          output.stdout = stdout
          output.stderr = stderr
          server.close()

      server.on 'close', done

    it 'should execute hooks and events in order', () ->
      events = getResults(output.stdout)
      assert.ok events is 'beforeAll,before,after,afterAll'

  describe "tests a blueprint containing an endpoint with schema", () ->
    describe "and server is responding in accordance with the schema", () ->

      before (done) ->
        cmd = "#{DREDD_BIN} ./test/fixtures/schema.apib http://localhost:#{PORT}"

        app = express()

        app.get '/', (req, res) ->
          res.setHeader 'Content-Type', 'application/json'
          response =
            data:
              expires: 1234,
              token: 'this should pass since it is a string'

          res.status(200).send response

        server = app.listen PORT, () ->
          execCommand cmd, () ->
            server.close()

        server.on 'close', done

      it 'exit status should be 0 (success)', () ->
        assert.equal exitStatus, 0

    describe "and server is NOT responding in accordance with the schema", () ->

      before (done) ->
        cmd = "#{DREDD_BIN} ./test/fixtures/schema.apib http://localhost:#{PORT}"

        app = express()

        app.get '/', (req, res) ->
          res.setHeader 'Content-Type', 'application/json'
          response =
            data:
              expires: 'this should fail since it is a string',
              token: 'this should pass since it is a string'

          res.status(200).send response

        server = app.listen PORT, () ->
          execCommand cmd, () ->
            server.close()

        server.on 'close', done

      it 'exit status should be 1 (failure)', () ->
        assert.equal exitStatus, 1

  describe "when blueprint path is a glob", () ->
    describe "and called with --names options", () ->
      before (done) ->
        cmd = "#{DREDD_BIN} ./test/fixtures/multifile/*.apib http://localhost --names"
        execCommand cmd, () ->
          done()

      it 'it should include all paths from all blueprints matching the glob', () ->
        assert.include stdout, '> /greeting > GET'
        assert.include stdout, '> /message > GET'
        assert.include stdout, '> /name > GET'

      it 'should exit with status 0', () ->
        assert.equal exitStatus, 0

    describe 'and called with hooks', () ->

      receivedRequests = []

      before (done) ->
        cmd = "#{DREDD_BIN} ./test/fixtures/multifile/*.apib http://localhost:#{PORT} --hookfiles=./test/fixtures/multifile/multifile_hooks.coffee"

        app = express()

        app.get '/name', (req, res) ->
          receivedRequests.push req
          res.setHeader 'content-type', 'text/plain'
          res.status(200).send "Adam\n"

        app.get '/greeting', (req, res) ->
          receivedRequests.push req
          res.setHeader 'content-type', 'text/plain'
          res.status(200).send "Howdy!\n"

        app.get '/message', (req, res) ->
          receivedRequests.push req
          res.setHeader 'content-type', 'text/plain'
          res.status(200).send "Hello World!\n"

        server = app.listen PORT, () ->
          execCommand cmd, () ->
            server.close()

        server.on 'close', done

      it 'should eval the hook for each transaction', () ->
        assert.include stdout, 'after name'
        assert.include stdout, 'after greeting'
        assert.include stdout, 'after message'

      it 'should exit with status 0', () ->
        assert.equal exitStatus, 0, (stdout+stderr)

      it 'server should receive 3 requests', () ->
        assert.lengthOf receivedRequests, 3


  describe "when called with additional --path argument which is a glob", () ->
    describe "and called with --names options", () ->
      before (done) ->
        cmd = "#{DREDD_BIN} ./test/fixtures/multiple-examples.apib http://localhost --path=./test/fixtures/multifile/*.apib --names --no-color"
        execCommand cmd, () ->
          done()

      it 'it should include all paths from all blueprints matching all paths and globs', () ->
        assert.include stdout, 'Greeting API > /greeting > GET'
        assert.include stdout, 'Message API > /message > GET'
        assert.include stdout, 'Name API > /name > GET'
        assert.include stdout, 'Machines API > Machines > Machines collection > Get Machines > Example 1'
        assert.include stdout, 'Machines API > Machines > Machines collection > Get Machines > Example 2'

      it 'should exit with status 0', () ->
        assert.equal exitStatus, 0

  describe "Using sandboxed hooks", () ->
    resourceRequested = false

    before (done) ->
      cmd = "#{DREDD_BIN} ./test/fixtures/single-get.apib http://localhost:#{PORT} --no-color --sandbox --hookfiles=./test/fixtures/sandboxed-hook.js"

      app = express()

      app.get '/machines', (req, res) ->
        resourceRequested = true
        res.setHeader 'Content-Type', 'application/json'
        machine =
          type: 'bulldozer'
          name: 'willy'
        response = [machine]
        res.status(200).send response

      server = app.listen PORT, () ->
        execCommand cmd, () ->
          server.close()

      server.on 'close', done

    it 'should hit the resource', () ->
      assert.ok resourceRequested

    it 'exit status should be 0', () ->
      assert.equal exitStatus, 1

    it 'stdout shoud contain fail message', () ->
      assert.include stdout, 'failed in sandboxed hook'

    it 'stdout shoud contain sandbox messagae', () ->
      assert.include stdout, 'Loading hookfiles in sandboxed context'
