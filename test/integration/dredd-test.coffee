{assert} = require 'chai'
sinon = require 'sinon'
express = require 'express'
clone = require 'clone'
fs = require 'fs'
bodyParser = require 'body-parser'

proxyquire = require('proxyquire').noCallThru()

packageJson = require '../../package.json'
loggerStub = require '../../src/logger'

PORT = 9876

exitStatus = null

stderr = ''
stdout = ''

addHooksStub = proxyquire '../../src/add-hooks', {
  './logger': loggerStub
}
transactionRunner = proxyquire '../../src/transaction-runner', {
  './add-hooks': addHooksStub
  './logger': loggerStub
}
Dredd = proxyquire '../../src/dredd', {
  './transaction-runner': transactionRunner
  './logger': loggerStub
}

execCommand = (options = {}, cb) ->
  stdout = ''
  stderr = ''
  exitStatus = null
  finished = false
  options.server ?= "http://localhost:#{PORT}"
  options.level ?= 'info'
  new Dredd(options).run (error, stats = {}) ->
    if not finished
      finished = true
      if error?.message
        stderr += error.message
      exitStatus = if (error or (1 * stats.failures + 1 * stats.errors) > 0) then 1 else 0
      cb null, stdout, stderr, exitStatus
  return

describe "Dredd class Integration", () ->
  dreddCommand = null
  custom = {}

  before ->
    for method in ['warn', 'error'] then do (method) ->
      sinon.stub loggerStub, method, (chunk) -> stderr += "\n#{method}: #{chunk}"
    for method in ['log', 'info', 'silly', 'verbose', 'test', 'diff', 'complete', 'pass', 'skip', 'debug', 'fail', 'request', 'expected', 'actual'] then do (method) ->
      sinon.stub loggerStub, method, (chunk) -> stdout += "\n#{method}: #{chunk}"
    return

  after ->
    for method in ['warn', 'error']
      loggerStub[method].restore()
    for method in ['log', 'info', 'silly', 'verbose', 'test', 'diff', 'complete', 'pass', 'skip', 'debug', 'fail', 'request', 'expected', 'actual']
      loggerStub[method].restore()
    return


  describe "when creating Dredd instance with existing blueprint and responding server", () ->
    describe "when the server is responding as specified in the blueprint", () ->

      before (done) ->
        cmd =
          options:
            path: "./test/fixtures/single-get.apib"

        app = express()

        app.get '/machines', (req, res) ->
          res.type('json').status(200).send [type: 'bulldozer', name: 'willy']

        server = app.listen PORT, () ->
          execCommand cmd, ->
            server.close()

        server.on 'close', done

      it 'exit status should be 0', () ->
        assert.equal exitStatus, 0

    describe "when the server is sending different response", () ->
      before (done) ->
        cmd =
          options:
            path: ["./test/fixtures/single-get.apib"]

        app = express()

        app.get '/machines', (req, res) ->
          res.type('json').status(201).send [kind: 'bulldozer', imatriculation: 'willy']

        server = app.listen PORT, () ->
          execCommand cmd, () ->
            server.close()

        server.on 'close', done

      it 'exit status should be 1', () ->
        assert.equal exitStatus, 1


  describe "when using reporter -r apiary in DREDD_REST_DEBUG mode", () ->
    server = null
    server2 = null
    receivedRequest = null
    exitStatus = null

    before (done) ->
      cmd =
        options:
          path: ["./test/fixtures/single-get.apib"]
          reporter: ["apiary"]
        custom:
          apiaryApiUrl: "http://127.0.0.1:#{PORT+1}"
          dreddRestDebug: '1'

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
        res.type('json').status(200).send [type: 'bulldozer', name: 'willy']

      server = app.listen PORT, () ->
        server2 = apiary.listen (PORT+1), ->
          execCommand cmd, () ->
            server2.close ->
              server.close ->

      server.on 'close', done

    it 'should print warning about missing APIARY_API_KEY and APIARY_API_NAME', () ->
      assert.include stderr, 'Apiary reporter environment variable APIARY_API_KEY or APIARY_API_NAME not defined.'

    it 'should print using the new reporter', () ->
      assert.include stdout, 'http://url.me/test/run/1234_id'

    it 'should send results from gavel', ()->
      assert.isObject receivedRequest
      assert.deepProperty receivedRequest, 'resultData.request'
      assert.deepProperty receivedRequest, 'resultData.realResponse'
      assert.deepProperty receivedRequest, 'resultData.expectedResponse'
      assert.deepProperty receivedRequest, 'resultData.result.body.validator'
      assert.deepProperty receivedRequest, 'resultData.result.headers.validator'
      assert.deepProperty receivedRequest, 'resultData.result.statusCode.validator'


      it 'prints out an error message', ->
        assert.notEqual exitStatus, 0


  describe "when called with arguments", () ->

    describe '--path argument is a string', ->
      before (done) ->
        cmd =
          options:
            path: ["./test/fixtures/single-get.apib", './test/fixtures/single-get.apib']

        app = express()

        app.get '/machines', (req, res) ->
          response = [type: 'bulldozer', name: 'willy']
          res.type('json').status(200).send response

        server = app.listen PORT, () ->
          execCommand cmd, (error, stdOut, stdErr, code) ->
            err = stdErr
            out = stdOut
            exitCode = code
            server.close()

        server.on 'close', done

      it 'prints out ok', ->
        assert.equal exitStatus, 0

    describe "when using reporter -r apiary", () ->
      server = null
      server2 = null
      receivedRequest = null
      exitStatus = null

      before (done) ->
        cmd =
          options:
            path: ["./test/fixtures/single-get.apib"]
            reporter: ['apiary']
          custom:
            apiaryReporterEnv:
              APIARY_API_URL: "http://127.0.0.1:#{PORT+1}"
              DREDD_REST_DEBUG: '1'

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
          res.type('json').status(200).send [type: 'bulldozer', name: 'willy']

        server = app.listen PORT, () ->
          server2 = apiary.listen (PORT+1), ->
            execCommand cmd, () ->
              server2.close ->
                server.close ->

        server.on 'close', done

      it 'should print warning about missing APIARY_API_KEY and APIARY_API_NAME', () ->
        assert.include stderr, 'Apiary reporter environment variable APIARY_API_KEY or APIARY_API_NAME not defined.'

      it 'should print using the new reporter', () ->
        assert.include stdout, 'http://url.me/test/run/1234_id'

      it 'should send results from gavel', ()->
        assert.isObject receivedRequest
        assert.deepProperty receivedRequest, 'resultData.request'
        assert.deepProperty receivedRequest, 'resultData.realResponse'
        assert.deepProperty receivedRequest, 'resultData.expectedResponse'
        assert.deepProperty receivedRequest, 'resultData.result.body.validator'
        assert.deepProperty receivedRequest, 'resultData.result.headers.validator'
        assert.deepProperty receivedRequest, 'resultData.result.statusCode.validator'


  describe "when blueprint file should be loaded from 'http(s)://...' url", ->
    server = null
    loadedFromServer = null
    connectedToServer = null
    notFound = null
    fileFound = null

    errorCmd =
      server: "http://localhost:#{PORT+1}"
      options:
        path: ["http://localhost:#{PORT+1}/connection-error.apib"]

    wrongCmd =
      options:
        path: ["http://localhost:#{PORT}/not-found.apib"]

    goodCmd =
      options:
        path: ["http://localhost:#{PORT}/file.apib"]

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
        res.type('json').status(200).send [type: 'bulldozer', name: 'willy']

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

