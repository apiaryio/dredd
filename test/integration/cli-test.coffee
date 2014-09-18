{assert} = require('chai')
{exec} = require('child_process')
express = require 'express'
fs = require 'fs'



PORT = '3333'
CMD_PREFIX = ''

stderr = ''
stdout = ''
exitStatus = null
requests = []

execCommand = (cmd, callback) ->
  stderr = ''
  stdout = ''
  exitStatus = null

  cli = exec CMD_PREFIX + cmd, (error, out, err) ->
    stdout = out
    stderr = err

    if error
      exitStatus = error.code

  exitEventName = if process.version.split('.')[1] is '6' then 'exit' else 'close'

  cli.on exitEventName, (code) ->
    exitStatus = code if exitStatus == null and code != undefined
    callback(undefined, stdout, stderr)


describe "Command line interface", () ->

  describe "When blueprint file not found", (done) ->
    before (done) ->
      cmd = "./bin/dredd ./test/fixtures/nonexistent_path.md http://localhost:#{PORT}"

      execCommand cmd, done

    it 'should exit with status 1', () ->
      assert.equal exitStatus, 1

    it 'should print error message to stderr', () ->
      assert.include stderr, 'Error: ENOENT, open'

  describe "Arguments with existing bleuprint and responding server", () ->
    describe "when executing the command and the server is responding as specified in the blueprint", () ->

      before (done) ->
        cmd = "./bin/dredd ./test/fixtures/single-get.apib http://localhost:#{PORT}"

        app = express()

        app.get '/machines', (req, res) ->
          res.setHeader 'Content-Type', 'application/json'
          machine =
            type: 'bulldozer'
            name: 'willy'
          response = [machine]
          res.send 200, response

        server = app.listen PORT, () ->
          execCommand cmd, () ->
            server.close()

        server.on 'close', done

      it 'exit status should be 0', () ->
        assert.equal exitStatus, 0

    describe "when executing the command and the server is responding as specified in the blueprint, endpoint with path", () ->
      before (done) ->
        cmd = "./bin/dredd ./test/fixtures/single-get.apib http://localhost:#{PORT}/v2/"

        app = express()

        app.get '/v2/machines', (req, res) ->
          res.setHeader 'Content-Type', 'application/json'
          machine =
            type: 'bulldozer'
            name: 'willy'
          response = [machine]
          res.send 200, response

        server = app.listen PORT, () ->
          execCommand cmd, () ->
            server.close()

        server.on 'close', done

      it 'exit status should be 0', () ->
        assert.equal exitStatus, 0

    describe "when executing the command and the server is sending different response", () ->
      before (done) ->
        cmd = "./bin/dredd ./test/fixtures/single-get.apib http://localhost:#{PORT}"

        app = express()

        app.get '/machines', (req, res) ->
          res.setHeader 'Content-Type', 'application/json'
          machine =
            kind: 'bulldozer'
            imatriculation: 'willy'
          response = [machine]
          res.send 201, response

        server = app.listen PORT, () ->
          execCommand cmd, () ->
            server.close()

        server.on 'close', done

      it 'exit status should be 1', () ->
        assert.equal exitStatus, 1

  describe "when called with arguments", () ->

    describe "when using additional reporters with -r", () ->

      recievedRequest = {}

      before (done) ->
        cmd = "./bin/dredd ./test/fixtures/single-get.apib http://localhost:#{PORT} -r nyan"

        app = express()

        app.get '/machines', (req, res) ->
          recievedRequest = req
          res.setHeader 'Content-Type', 'application/json'
          machine =
            type: 'bulldozer'
            name: 'willy'
          response = [machine]
          res.send 200, response

        server = app.listen PORT, () ->
          execCommand cmd, () ->
            server.close()

        server.on 'close', done

        it 'should print using the new reporter', ()->
          # nyan cat ears should exist in stdout
          assert.ok stdout.indexOf '/\\_/\\' > -1


    describe 'when using an output path with -o', () ->

      recievedRequest = {}

      before (done) ->
        cmd = "./bin/dredd ./test/fixtures/single-get.apib http://localhost:#{PORT} -r junit -o test_file_output.xml"

        app = express()

        app.get '/machines', (req, res) ->
          recievedRequest = req
          res.setHeader 'Content-Type', 'application/json'
          machine =
            type: 'bulldozer'
            name: 'willy'
          response = [machine]
          res.send 200, response

        server = app.listen PORT, () ->
          execCommand cmd, () ->
            server.close()

        server.on 'close', done

      after () ->
        fs.unlinkSync process.cwd() + "/test_file_output.xml"

      it 'should write to the specified file', () ->
        assert.ok fs.existsSync process.cwd() + "/test_file_output.xml"


    describe "when adding additional headers with -h", () ->

      recievedRequest = {}

      before (done) ->
        cmd = "./bin/dredd ./test/fixtures/single-get.apib http://localhost:#{PORT} -h Accept:application/json"

        app = express()

        app.get '/machines', (req, res) ->
          recievedRequest = req
          res.setHeader 'Content-Type', 'application/json'
          machine =
            type: 'bulldozer'
            name: 'willy'
          response = [machine]
          res.send 200, response

        server = app.listen PORT, () ->
          execCommand cmd, () ->
            server.close()

        server.on 'close', done

      it 'should have an additional header in the request', () ->
        assert.ok recievedRequest.headers.accept is 'application/json'


    describe "when adding basic auth credentials with -u", () ->

      recievedRequest = {}

      before (done) ->
        cmd = "./bin/dredd ./test/fixtures/single-get.apib http://localhost:#{PORT} -u username:password"

        app = express()

        app.get '/machines', (req, res) ->
          recievedRequest = req
          res.setHeader 'Content-Type', 'application/json'
          machine =
            type: 'bulldozer'
            name: 'willy'
          response = [machine]
          res.send 200, response

        server = app.listen PORT, () ->
          execCommand cmd, () ->
            server.close()

        server.on 'close', done

      it 'should have an authorization header in the request', () ->
        assert.ok recievedRequest.headers.authorization

      it 'should contain a base64 encoded string of the username and password', () ->
        assert.ok recievedRequest.headers.authorization is 'Basic ' + new Buffer('username:password').toString('base64')


    describe "when sorting requests with -s", () ->

      recievedRequest = {}

      before (done) ->
        cmd = "./bin/dredd ./test/fixtures/apiary.apib http://localhost:#{PORT} -s"

        app = express()

        app.get '/machines', (req, res) ->
          recievedRequest = req
          res.setHeader 'Content-Type', 'application/json'
          machine =
            type: 'bulldozer'
            name: 'willy'
          response = [machine]
          res.send 200, response

        server = app.listen PORT, () ->
          execCommand cmd, () ->
            server.close()

        server.on 'close', done

      it 'should perform the POST, GET, PUT, DELETE in order', () ->
        assert.ok stdout.indexOf 'POST'< stdout.indexOf 'GET' < stdout.indexOf 'PUT' < stdout.indexOf 'DELETE'

    describe 'when displaying errors inline with -e', () ->

      before (done) ->
        cmd = "./bin/dredd ./test/fixtures/single-get.apib http://localhost:#{PORT} -e"

        app = express()

        app.get '/machines', (req, res) ->
          res.setHeader 'Content-Type', 'application/json'
          machine =
            kind: 'bulldozer'
            imatriculation: 'willy'
          response = [machine]
          res.send 201, response

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

      recievedRequest = {}

      before (done) ->
        cmd = "./bin/dredd ./test/fixtures/single-get.apib http://localhost:#{PORT} -d"

        app = express()

        app.get '/machines', (req, res) ->
          recievedRequest = req
          res.setHeader 'Content-Type', 'application/json'
          machine =
            type: 'bulldozer'
            name: 'willy'
          response = [machine]
          res.send 200, response

        server = app.listen PORT, () ->
          execCommand cmd, () ->
            server.close()

        server.on 'close', done

      it 'should display details on passing tests', () ->
        # the request: block is not shown for passing tests normally
        assert.ok stdout.indexOf 'request' > -1

    describe "when filtering request methods with -m", () ->

      describe 'when blocking a request', () ->

        recievedRequest = {}

        before (done) ->
          cmd = "./bin/dredd ./test/fixtures/single-get.apib http://localhost:#{PORT} -m POST"

          app = express()

          app.get '/machines', (req, res) ->
            recievedRequest = req
            res.setHeader 'Content-Type', 'application/json'
            machine =
              type: 'bulldozer'
              name: 'willy'
            response = [machine]
            res.send 200, response

          server = app.listen PORT, () ->
            execCommand cmd, () ->
              server.close()

          server.on 'close', done

          it 'should not send the request request', () ->
            assert.equal recievedRequest, {}

      describe 'when not blocking a request', () ->

        recievedRequest = {}

        before (done) ->
          cmd = "./bin/dredd ./test/fixtures/single-get.apib http://localhost:#{PORT} -m GET"

          app = express()

          app.get '/machines', (req, res) ->
            recievedRequest = req
            res.setHeader 'Content-Type', 'application/json'
            machine =
              type: 'bulldozer'
              name: 'willy'
            response = [machine]
            res.send 200, response

          server = app.listen PORT, () ->
            execCommand cmd, () ->
              server.close()

          server.on 'close', done

        it 'should allow the request to go through', () ->
          assert.ok recievedRequest.headers

    describe 'when suppressing color with --no-color', () ->

      recievedRequest = {}

      before (done) ->
        cmd = "./bin/dredd ./test/fixtures/single-get.apib http://localhost:#{PORT} --no-color"

        app = express()

        app.get '/machines', (req, res) ->
          recievedRequest = req
          res.setHeader 'Content-Type', 'application/json'
          machine =
            type: 'bulldozer'
            name: 'willy'
          response = [machine]
          res.send 200, response

        server = app.listen PORT, () ->
          execCommand cmd, () ->
            server.close()

        server.on 'close', done

      it 'should print without colors', () ->
        # if colors are not on, there is no closing color code between
        # the "pass" and the ":"
        assert.ok stdout.indexOf 'pass:' > -1

    describe 'when setting the log output level with -l', () ->

      recievedRequest = {}

      before (done) ->
        cmd = "./bin/dredd ./test/fixtures/single-get.apib http://localhost:#{PORT} -l=error"

        app = express()

        app.get '/machines', (req, res) ->
          recievedRequest = req
          res.setHeader 'Content-Type', 'application/json'
          machine =
            type: 'bulldozer'
            name: 'willy'
          response = [machine]
          res.send 200, response

        server = app.listen PORT, () ->
          execCommand cmd, () ->
            server.close()

        server.on 'close', done

      it 'should not display anything', () ->
        # at the "error" level, complete should not be shown
        assert.ok stdout.indexOf 'complete' is -1

    describe 'when showing timestamps with -t', () ->

      recievedRequest = {}

      before (done) ->
        cmd = "./bin/dredd ./test/fixtures/single-get.apib http://localhost:#{PORT} -t"

        app = express()

        app.get '/machines', (req, res) ->
          recievedRequest = req
          res.setHeader 'Content-Type', 'application/json'
          machine =
            type: 'bulldozer'
            name: 'willy'
          response = [machine]
          res.send 200, response

        server = app.listen PORT, () ->
          execCommand cmd, () ->
            server.close()

        server.on 'close', done

      it 'should display timestamps', () ->
        # look for the prefix for cli output with timestamps
        assert.notEqual stdout.indexOf 'Z -', -1

  describe 'when loading hooks with --hookfiles', () ->

    recievedRequest = {}

    before (done) ->
      cmd = "./bin/dredd ./test/fixtures/single-get.apib http://localhost:#{PORT} --hookfiles=./test/fixtures/*_hooks.*"

      app = express()

      app.get '/machines', (req, res) ->
        recievedRequest = req
        res.setHeader 'Content-Type', 'application/json'
        machine =
          type: 'bulldozer'
          name: 'willy'
        response = [machine]
        res.send 200, response

      server = app.listen PORT, () ->
        execCommand cmd, () ->
          server.close()

      server.on 'close', done

    it 'should modify the transaction with hooks', () ->
      assert.equal recievedRequest.headers['header'], '123232323'

  describe 'when describing events in hookfiles', () ->

    recievedRequest = {}
    output = {}

    containsLine = (str, expected) ->
      lines = str.split('\n')
      for line in lines
        if line is expected
          return true
      return false

    before (done) ->
      cmd = "./bin/dredd ./test/fixtures/single-get.apib http://localhost:#{PORT} --hookfiles=./test/fixtures/*_events.*"

      app = express()

      app.get '/machines', (req, res) ->
        recievedRequest = req
        res.setHeader 'Content-Type', 'application/json'
        machine =
          type: 'bulldozer'
          name: 'willy'
        response = [machine]
        res.send 200, response

      server = app.listen PORT, () ->
        execCommand cmd, (err, stdout, stderr) ->
          output.stdout = stdout
          output.stderr = stderr
          server.close()

      server.on 'close', done

    it 'should execute the before and after events', () ->
      assert.ok containsLine(output.stdout, 'beforeAll')
      assert.ok containsLine(output.stdout, 'afterAll')

  describe 'when describing both hooks and events in hookfiles', () ->

    recievedRequest = {}
    output = {}

    getResults = (str) ->
      ret = []
      lines = str.split('\n')
      for line in lines
        if line.startsWith('*** ')
          ret.push(line.substr(4))
      return ret.join(',')

    before (done) ->
      cmd = "./bin/dredd ./test/fixtures/single-get.apib http://localhost:#{PORT} --hookfiles=./test/fixtures/*_all.*"

      app = express()

      app.get '/machines', (req, res) ->
        recievedRequest = req
        res.setHeader 'Content-Type', 'application/json'
        machine =
          type: 'bulldozer'
          name: 'willy'
        response = [machine]
        res.send 200, response

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
        cmd = "./bin/dredd ./test/fixtures/schema.apib http://localhost:#{PORT}"

        app = express()

        app.get '/', (req, res) ->
          res.setHeader 'Content-Type', 'application/json'
          response =
            data:
              expires: 1234,
              token: 'this should pass since it is a string'

          res.send 200, response

        server = app.listen PORT, () ->
          execCommand cmd, () ->
            server.close()

        server.on 'close', done

      it 'exit status should be 0 (success)', () ->
        assert.equal exitStatus, 0

    describe "and server is NOT responding in accordance with the schema", () ->

      before (done) ->
        cmd = "./bin/dredd ./test/fixtures/schema.apib http://localhost:#{PORT}"

        app = express()

        app.get '/', (req, res) ->
          res.setHeader 'Content-Type', 'application/json'
          response =
            data:
              expires: 'this should fail since it is a string',
              token: 'this should pass since it is a string'

          res.send 200, response

        server = app.listen PORT, () ->
          execCommand cmd, () ->
            server.close()

        server.on 'close', done

      it 'exit status should be 1 (failure)', () ->
        assert.equal exitStatus, 1
