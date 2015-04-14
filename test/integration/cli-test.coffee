{assert} = require('chai')
{exec} = require('child_process')
express = require 'express'
clone = require 'clone'
bodyParser = require 'body-parser'
fs = require 'fs'

PORT = 3333
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


describe "Command line interface", () ->

  describe "When blueprint file not found", ->
    before (done) ->
      cmd = "./bin/dredd ./test/fixtures/nonexistent_path.md http://localhost:#{PORT}"

      execCommand cmd, done

    it 'should exit with status 1', () ->
      assert.equal exitStatus, 1

    it 'should print error message to stderr', () ->
      assert.include stderr, 'not found'


  describe "When blueprint file should be loaded from 'http(s)://...' url", ->
    server = null
    loadedFromServer = null
    connectedToServer = null
    notFound = null
    fileFound = null

    errorCmd = "./bin/dredd http://localhost:#{PORT+1}/connection-error.apib http://localhost:#{PORT+1}"
    wrongCmd = "./bin/dredd http://localhost:#{PORT}/not-found.apib http://localhost:#{PORT}"
    goodCmd = "./bin/dredd http://localhost:#{PORT}/file.apib http://localhost:#{PORT}"

    afterEach ->
      connectedToServer = null

    before (done) ->
      app = express()

      app.use (req, res, next) ->
        connectedToServer = true
        next()

      app.get '/', (req, res) ->
        res.sendStatus 404

      app.get '/file.apib', (req, res) ->
        fileFound = true
        res.type('text')
        stream = fs.createReadStream './test/fixtures/single-get.apib'
        stream.pipe res

      app.get '/machines', (req, res) ->
        res.setHeader 'Content-Type', 'application/json'
        machine =
          type: 'bulldozer'
          name: 'willy'
        response = [machine]
        res.status(200).send response

      app.get '/not-found.apib', (req, res) ->
        notFound = true
        res.status(404).end()

      server = app.listen PORT, ->
        done()

    after (done) ->
      server.close ->
        app = null
        server = null
        done()

    describe 'and I try to load a file from bad hostname at all', ->
      before (done) ->
        execCommand errorCmd, ->
          done()

      after ->
        connectedToServer = null

      it 'should not send a GET to the server', ->
        assert.isNull connectedToServer

      it 'should exit with status 1', ->
        assert.equal exitStatus, 1

      it 'should print error message to stderr', ->
        assert.include stderr, 'Error when loading file from URL'
        assert.include stderr, 'Is the provided URL correct?'
        assert.include stderr, 'connection-error.apib'

    describe 'and I try to load a file that does not exist from an existing server', ->
      before (done) ->
        execCommand wrongCmd, ->
          done()

      after ->
        connectedToServer = null

      it 'should connect to the right server', ->
        assert.isTrue connectedToServer

      it 'should send a GET to server at wrong URL', ->
        assert.isTrue notFound

      it 'should exit with status 1', ->
        assert.equal exitStatus, 1

      it 'should print error message to stderr', ->
        assert.include stderr, 'Unable to load file from URL'
        assert.include stderr, 'responded with status code 404'
        assert.include stderr, 'not-found.apib'

    describe 'and I try to load a file that actually is there', ->
      before (done) ->
        execCommand goodCmd, ->
          done()

      it 'should send a GET to the right server', ->
        assert.isTrue connectedToServer

      it 'should send a GET to server at good URL', ->
        assert.isTrue fileFound

      it 'should exit with status 0', ->
        assert.equal exitStatus, 0


  describe "Arguments with existing blueprint and responding server", () ->
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
          res.status(200).send response

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
          res.status(200).send response

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
          res.status(201).send response

        server = app.listen PORT, () ->
          execCommand cmd, () ->
            server.close()

        server.on 'close', done

      it 'exit status should be 1', () ->
        assert.equal exitStatus, 1

  describe "when called with arguments", () ->
    describe "when using reporter -r apiary", () ->
      server = null
      server2 = null
      receivedRequest = null

      before (done) ->
        cmd = "./bin/dredd ./test/fixtures/single-get.apib http://localhost:#{PORT} --reporter apiary"

        apiary = express()
        app = express()

        apiary.use bodyParser.json(size:'5mb')

        apiary.post '/apis/*', (req, res) ->
          if req.body and req.url.indexOf('/tests/steps') > -1
            receivedRequest ?= clone(req.body)
          res.type('json')
          res.status(201).send
            _id: '1234_id'
            testRunId: '6789_testRunId'
            reportUrl: 'http://url.me/test/run/1234_id'

        apiary.all '*', (req, res) ->
          res.type 'json'
          res.send {}

        app.get '/machines', (req, res) ->
          res.setHeader 'Content-Type', 'application/json'
          machine =
            type: 'bulldozer'
            name: 'willy'
          response = [machine]
          res.status(200).send response

        server = app.listen PORT, () ->
          server2 = apiary.listen (PORT+1), ->
            env = clone process.env
            env['APIARY_API_URL'] = "http://127.0.0.1:#{PORT+1}"
            execCommand cmd, {env}, () ->
              server2.close ->
                server.close ->

        server.on 'close', done

      it 'should exit with status 0', ()->
        assert.equal exitStatus, 0

      it 'should print using the new reporter', ()->
        assert.include stdout, 'http://url.me/test/run/1234_id'

      it 'should print warning about missing APIARY_API_KEY', ()->
        assert.include stdout, 'Apiary reporter environment variable APIARY_API_KEY'

      it 'should send results from gavel', ()->
        assert.isObject receivedRequest
        assert.deepProperty receivedRequest, 'resultData.request'
        assert.deepProperty receivedRequest, 'resultData.realResponse'
        assert.deepProperty receivedRequest, 'resultData.expectedResponse'
        assert.deepProperty receivedRequest, 'resultData.result.body.validator'
        assert.deepProperty receivedRequest, 'resultData.result.headers.validator'
        assert.deepProperty receivedRequest, 'resultData.result.statusCode.validator'


    describe "when using additional reporters with -r", () ->
      before (done) ->
        cmd = "./bin/dredd ./test/fixtures/single-get.apib http://localhost:#{PORT} -r nyan"

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

      it 'should print using the new reporter', ()->
        # nyan cat ears should exist in stdout
        assert.ok stdout.indexOf('/\\_/\\') > -1


    describe 'when using an output path with -o', () ->
      before (done) ->
        cmd = "./bin/dredd ./test/fixtures/single-get.apib http://localhost:#{PORT} -r junit -o test_file_output.xml"

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

      after () ->
        fs.unlinkSync process.cwd() + "/test_file_output.xml"

      it 'should write to the specified file', () ->
        assert.ok fs.existsSync process.cwd() + "/test_file_output.xml"


    describe "when adding additional headers with -h", () ->

      receivedRequest = {}

      before (done) ->
        cmd = "./bin/dredd ./test/fixtures/single-get.apib http://localhost:#{PORT} -h Accept:application/json"

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
        cmd = "./bin/dredd ./test/fixtures/single-get.apib http://localhost:#{PORT} -u username:password"

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
        cmd = "./bin/dredd ./test/fixtures/apiary.apib http://localhost:#{PORT} -s"

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
        cmd = "./bin/dredd ./test/fixtures/single-get.apib http://localhost:#{PORT} -e"

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
        cmd = "./bin/dredd ./test/fixtures/single-get.apib http://localhost:#{PORT} -d"

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
          cmd = "./bin/dredd ./test/fixtures/single-get.apib http://localhost:#{PORT} -m POST"

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
          cmd = "./bin/dredd ./test/fixtures/single-get.apib http://localhost:#{PORT} -m GET"

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
        cmd = "./bin/dredd ./test/fixtures/single-get.apib http://localhost:#{PORT} --path=./test/fixtures/multifile/*.apib --only=\"Message API > /message > GET\" --no-color"

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
        cmd = "./bin/dredd ./test/fixtures/single-get.apib http://localhost:#{PORT} --no-color"

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
        cmd = "./bin/dredd ./test/fixtures/single-get.apib http://localhost:#{PORT} --color false"

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
        cmd = "./bin/dredd ./test/fixtures/single-get.apib http://localhost:#{PORT} -l=error"

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
        cmd = "./bin/dredd ./test/fixtures/single-get.apib http://localhost:#{PORT} -t"

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
      cmd = "./bin/dredd ./test/fixtures/single-get.apib http://localhost:#{PORT} --hookfiles=./test/fixtures/*_hooks.*"

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
        if line is expected
          return true
      return false

    before (done) ->
      cmd = "./bin/dredd ./test/fixtures/single-get.apib http://localhost:#{PORT} --hookfiles=./test/fixtures/*_events.*"

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
      assert.ok containsLine(output.stdout, 'beforeAll')
      assert.ok containsLine(output.stdout, 'afterAll')

  describe 'when describing both hooks and events in hookfiles', () ->
    output = {}
    getResults = (str) ->
      ret = []
      lines = str.split('\n')
      for line in lines
        if line.indexOf('*** ') is 0
          ret.push(line.substr(4))
      return ret.join(',')

    before (done) ->
      cmd = "./bin/dredd ./test/fixtures/single-get.apib http://localhost:#{PORT} --hookfiles=./test/fixtures/*_all.*"

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
        cmd = "./bin/dredd ./test/fixtures/schema.apib http://localhost:#{PORT}"

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
        cmd = "./bin/dredd ./test/fixtures/schema.apib http://localhost:#{PORT}"

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
        cmd = "./bin/dredd ./test/fixtures/multifile/*.apib http://localhost --names"
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
        cmd = "./bin/dredd ./test/fixtures/multifile/*.apib http://localhost:#{PORT} --hookfiles=./test/fixtures/multifile/multifile_hooks.coffee"

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
        assert.equal exitStatus, 0

      it 'server should receive 3 requests', () ->
        assert.lengthOf receivedRequests, 3


  describe "when called with additional --path argument which is a glob", () ->
    describe "and called with --names options", () ->
      before (done) ->
        cmd = "./bin/dredd ./test/fixtures/multiple-examples.apib http://localhost --path=./test/fixtures/multifile/*.apib --names --no-color"
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


  # WARNING: this text is excluded from code coverage
  # it for some reason decreases coverage only in  coveralls
  describe "Using workaround for hooks in ruby", () ->
    resourceRequested = false

    before (done) ->
      cmd = "./bin/dredd ./test/fixtures/single-get.apib http://localhost:#{PORT} --no-color --hookfiles=./test/fixtures/ruby-hooks/hooks-worker-client.coffee"

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
      assert.include stdout, 'Yay! Failed in ruby!'

  describe "Using sandboxed hooks", () ->
    resourceRequested = false

    before (done) ->
      cmd = "./bin/dredd ./test/fixtures/single-get.apib http://localhost:#{PORT} --no-color --sandbox --hookfiles=./test/fixtures/sandboxed-hook.js"

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

  # WARNING: this text is excluded from code coverage
  # it for some reason decreases coverage on local and in coveralls
  describe.only 'when using --server', () ->
    resourceRequested = false

    before (done) ->
      cmd = "./bin/dredd ./test/fixtures/single-get.apib http://localhost:#{PORT} --server ./test/fixtures/scripts/dummy-server.sh --no-color"

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
      assert.equal exitStatus, 0

    it 'stdout shoud contain fail message', () ->
      assert.include stdout, 'dummy server'

