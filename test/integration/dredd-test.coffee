{assert} = require 'chai'
sinon = require 'sinon'
express = require 'express'
clone = require 'clone'
fs = require 'fs'
bodyParser = require 'body-parser'

proxyquire = require('proxyquire').noCallThru()

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
  options.server ?= "http://127.0.0.1:#{PORT}"
  options.level ?= 'info'
  new Dredd(options).run (error, stats = {}) ->
    if not finished
      finished = true
      if error?.message
        stderr += error.message
      exitStatus = if (error or (1 * stats.failures + 1 * stats.errors) > 0) then 1 else 0
      cb null, stdout, stderr, exitStatus
  return


describe 'Dredd class Integration', ->
  dreddCommand = null
  custom = {}

  before ->
    for method in ['warn', 'error'] then do (method) ->
      sinon.stub(loggerStub, method).callsFake (chunk) -> stderr += "\n#{method}: #{chunk}"
    for method in ['log', 'info', 'silly', 'verbose', 'test', 'hook', 'complete', 'pass', 'skip', 'debug', 'fail', 'request', 'expected', 'actual'] then do (method) ->
      sinon.stub(loggerStub, method).callsFake (chunk) -> stdout += "\n#{method}: #{chunk}"
    return

  after ->
    for method in ['warn', 'error']
      loggerStub[method].restore()
    for method in ['log', 'info', 'silly', 'verbose', 'test', 'hook', 'complete', 'pass', 'skip', 'debug', 'fail', 'request', 'expected', 'actual']
      loggerStub[method].restore()
    return


  describe "when creating Dredd instance with existing API description document and responding server", () ->
    describe "when the server is responding as specified in the API description", () ->

      before (done) ->
        cmd =
          options:
            path: "./test/fixtures/single-get.apib"

        app = express()

        app.get '/machines', (req, res) ->
          res.json [type: 'bulldozer', name: 'willy']

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
          res.status(201).json [kind: 'bulldozer', imatriculation: 'willy']

        server = app.listen PORT, () ->
          execCommand cmd, () ->
            server.close()

        server.on 'close', done

      it 'exit status should be 1', () ->
        assert.equal exitStatus, 1


  describe "when using reporter -r apiary with 'verbose' logging with custom apiaryApiKey and apiaryApiName", () ->
    server = null
    server2 = null
    receivedRequest = null
    receivedRequestTestRuns = null
    receivedHeaders = null
    receivedHeadersRuns = null
    exitStatus = null

    before (done) ->
      cmd =
        options:
          path: ["./test/fixtures/single-get.apib"]
          reporter: ["apiary"]
          level: 'verbose'
        custom:
          apiaryApiUrl: "http://127.0.0.1:#{PORT + 1}"
          apiaryApiKey: 'the-key'
          apiaryApiName: 'the-api-name'

      receivedHeaders = {}
      receivedHeadersRuns = {}

      apiary = express()
      app = express()

      apiary.use bodyParser.json(size:'5mb')

      apiary.post '/apis/*', (req, res) ->
        if req.body and req.url.indexOf('/tests/steps') > -1
          receivedRequest ?= clone(req.body)
          receivedHeaders[key.toLowerCase()] = val for key, val of req.headers
        if req.body and req.url.indexOf('/tests/runs') > -1
          receivedRequestTestRuns ?= clone(req.body)
          receivedHeadersRuns[key.toLowerCase()] = val for key, val of req.headers
        res.status(201).json
          _id: '1234_id'
          testRunId: '6789_testRunId'
          reportUrl: 'http://url.me/test/run/1234_id'

      apiary.all '*', (req, res) ->
        res.json {}

      app.get '/machines', (req, res) ->
        res.json [type: 'bulldozer', name: 'willy']

      server = app.listen PORT, () ->
        server2 = apiary.listen (PORT + 1), ->
          execCommand cmd, () ->
            server2.close ->
              server.close () ->
                done()

    it 'should not print warning about missing Apiary API settings', ->
      assert.notInclude stderr, 'Apiary API Key or API Project Subdomain were not provided.'

    it 'should contain Authentication header thanks to apiaryApiKey and apiaryApiName configuration', ->
      assert.propertyVal receivedHeaders, 'authentication', 'Token the-key'
      assert.propertyVal receivedHeadersRuns, 'authentication', 'Token the-key'

    it 'should send the test-run as a non-public one', ->
      assert.isObject receivedRequestTestRuns
      assert.propertyVal receivedRequestTestRuns, 'public', false

    it 'should print using the new reporter', ->
      assert.include stdout, 'http://url.me/test/run/1234_id'

    it 'should send results from Gavel', ->
      assert.isObject receivedRequest
      assert.nestedProperty receivedRequest, 'resultData.request'
      assert.nestedProperty receivedRequest, 'resultData.realResponse'
      assert.nestedProperty receivedRequest, 'resultData.expectedResponse'
      assert.nestedProperty receivedRequest, 'resultData.result.body.validator'
      assert.nestedProperty receivedRequest, 'resultData.result.headers.validator'
      assert.nestedProperty receivedRequest, 'resultData.result.statusCode.validator'

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
          res.json response

        server = app.listen PORT, () ->
          execCommand cmd, (error, stdOut, stdErr, code) ->
            err = stdErr
            out = stdOut
            exitCode = code
            server.close()

        server.on 'close', done

      it 'prints out ok', ->
        assert.equal exitStatus, 0

    describe "when using reporter -r apiary and the server isn't running", () ->
      server = null
      server2 = null
      receivedRequest = null
      exitStatus = null

      before (done) ->
        cmd =
          options:
            path: ["./test/fixtures/single-get.apib"]
            reporter: ['apiary']
            level: 'verbose'
          custom:
            apiaryReporterEnv:
              APIARY_API_URL: "http://127.0.0.1:#{PORT + 1}"

        apiary = express()

        apiary.use bodyParser.json(size:'5mb')

        apiary.post '/apis/*', (req, res) ->
          if req.body and req.url.indexOf('/tests/steps') > -1
            receivedRequest ?= clone(req.body)
          res.status(201).json
            _id: '1234_id'
            testRunId: '6789_testRunId'
            reportUrl: 'http://url.me/test/run/1234_id'

        apiary.all '*', (req, res) ->
          res.json {}

        server2 = apiary.listen (PORT + 1), ->
          execCommand cmd, () ->
            server2.close ->

        server2.on 'close', done

      it 'should print using the reporter', () ->
        assert.include stdout, 'http://url.me/test/run/1234_id'

      it 'should send results from gavel', () ->
        assert.isObject receivedRequest
        assert.nestedProperty receivedRequest, 'resultData.request'
        assert.nestedProperty receivedRequest, 'resultData.expectedResponse'
        assert.nestedProperty receivedRequest, 'resultData.result.general'

      it 'report should have message about server being down', () ->
        message = receivedRequest['resultData']['result']['general'][0]['message']
        assert.include message, 'connect'

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
            level: 'verbose'
          custom:
            apiaryReporterEnv:
              APIARY_API_URL: "http://127.0.0.1:#{PORT + 1}"

        apiary = express()
        app = express()

        apiary.use bodyParser.json(size:'5mb')

        apiary.post '/apis/*', (req, res) ->
          if req.body and req.url.indexOf('/tests/steps') > -1
            receivedRequest ?= clone(req.body)
          res.status(201).json
            _id: '1234_id'
            testRunId: '6789_testRunId'
            reportUrl: 'http://url.me/test/run/1234_id'

        apiary.all '*', (req, res) ->
          res.json {}

        app.get '/machines', (req, res) ->
          res.json [type: 'bulldozer', name: 'willy']

        server = app.listen PORT, () ->
          server2 = apiary.listen (PORT + 1), ->

        execCommand cmd, () ->
          server2.close ->
            server.close ->

        server.on 'close', done

      it 'should print warning about missing Apiary API settings', ->
        assert.include stderr, 'Apiary API Key or API Project Subdomain were not provided.'

      it 'should print link to documentation', ->
        assert.include stderr, 'https://dredd.readthedocs.io/en/latest/how-to-guides/#using-apiary-reporter-and-apiary-tests'

      it 'should print using the new reporter', ->
        assert.include stdout, 'http://url.me/test/run/1234_id'

      it 'should send results from Gavel', ->
        assert.isObject receivedRequest
        assert.nestedProperty receivedRequest, 'resultData.request'
        assert.nestedProperty receivedRequest, 'resultData.realResponse'
        assert.nestedProperty receivedRequest, 'resultData.expectedResponse'
        assert.nestedProperty receivedRequest, 'resultData.result.body.validator'
        assert.nestedProperty receivedRequest, 'resultData.result.headers.validator'
        assert.nestedProperty receivedRequest, 'resultData.result.statusCode.validator'


  describe "when API description document should be loaded from 'http(s)://...' url", ->
    server = null
    loadedFromServer = null
    connectedToServer = null
    notFound = null
    fileFound = null

    errorCmd =
      server: "http://127.0.0.1:#{PORT + 1}"
      options:
        path: ["http://127.0.0.1:#{PORT + 1}/connection-error.apib"]

    wrongCmd =
      options:
        path: ["http://127.0.0.1:#{PORT}/not-found.apib"]

    goodCmd =
      options:
        path: ["http://127.0.0.1:#{PORT}/file.apib"]

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
        res.json [type: 'bulldozer', name: 'willy']

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

  describe 'when i use sandbox and hookfiles option', () ->
    describe 'and I run a test', () ->
      requested = null
      before (done) ->
        cmd =
          options:
            path: "./test/fixtures/single-get.apib"
            sandbox: true
            hookfiles: './test/fixtures/sandboxed-hook.js'

        app = express()

        app.get '/machines', (req, res) ->
          requested = true
          res.json [type: 'bulldozer', name: 'willy']

        server = app.listen PORT, () ->
          execCommand cmd, ->
            server.close()

        server.on 'close', done

      it 'exit status should be 1', () ->
        assert.equal exitStatus, 1

      it 'stdout should contain fail message', () ->
        assert.include stdout, 'failed in sandboxed hook'

      it 'stdout should contain sandbox messagae', () ->
        assert.include stdout, 'Loading hook files in sandboxed context'

      it 'should perform the request', () ->
        assert.isTrue requested

  describe 'when i use sandbox and hookData option', () ->
    describe 'and I run a test', () ->
      requested = null
      before (done) ->
        cmd =
          hooksData:
            "./test/fixtures/single-get.apib": """
            after('Machines > Machines collection > Get Machines', function(transaction){
              transaction['fail'] = 'failed in sandboxed hook from string';
            });
            """
          options:
            path: "./test/fixtures/single-get.apib"
            sandbox: true

        app = express()

        app.get '/machines', (req, res) ->
          requested = true
          res.json [type: 'bulldozer', name: 'willy']

        server = app.listen PORT, () ->
          execCommand cmd, ->
            server.close()

        server.on 'close', done

      it 'exit status should be 1', () ->
        assert.equal exitStatus, 1

      it 'stdout should contain fail message', () ->
        assert.include stdout, 'failed in sandboxed hook from string'

      it 'stdout should not sandbox messagae', () ->
        assert.notInclude stdout, 'Loading hook files in sandboxed context'

      it 'should perform the request', () ->
        assert.isTrue requested

  describe 'when use old buggy (#168) path with leading whitespace in hooks', () ->
    describe 'and I run a test', () ->
      requested = null
      before (done) ->
        cmd =
          hooksData:
            "hooks.js": """
            before(' > Machines collection > Get Machines', function(transaction){
              throw(new Error('Whitespace transaction name'));
            });

            before('Machines collection > Get Machines', function(transaction){
              throw(new Error('Fixed transaction name'));
            });

            """
          options:
            path: "./test/fixtures/single-get-nogroup.apib"
            sandbox: true

        app = express()

        app.get '/machines', (req, res) ->
          requested = true
          res.json [type: 'bulldozer', name: 'willy']

        server = app.listen PORT, () ->
          execCommand cmd, ->
            server.close()

        server.on 'close', done

      it 'should execute hook with whitespaced name', () ->
        assert.include stderr, 'Whitespace transaction name'

      it 'should execute hook with fuxed name', () ->
        assert.include stderr, 'Fixed transaction name'

  describe('when Swagger document has multiple responses', ->
    reTransaction = /(\w+): (\w+) \((\d+)\) \/honey/g
    actual = undefined

    before((done) ->
      execCommand(
        options:
          path: './test/fixtures/multiple-responses.yaml'
      , (err) ->
        matches = []
        matches.push(groups) while groups = reTransaction.exec(stdout)
        actual = matches.map((match) ->
          keyMap = {'0': 'name', '1': 'action', '2': 'method', '3': 'statusCode'}
          match.reduce((result, element, i) ->
            Object.assign(result, "#{keyMap[i]}": element)
          , {})
        )
        done(err)
      )
    )

    it('recognizes all 6 transactions', ->
      assert.equal(actual.length, 6)
    )

    [
      {action: 'skip', statusCode: '400'}
      {action: 'skip', statusCode: '400'}
      {action: 'skip', statusCode: '500'}
      {action: 'skip', statusCode: '500'}
      {action: 'fail', statusCode: '200'}
      {action: 'fail', statusCode: '200'}
    ].forEach((expected, i) ->
      context("the transaction ##{i + 1}", ->
        it("has status code #{expected.statusCode}", ->
          assert.equal(expected.statusCode, actual[i].statusCode)
        )
        it("is #{if expected.action is 'skip' then '' else 'not '}skipped by default", ->
          assert.equal(expected.action, actual[i].action)
        )
      )
    )
  )

  describe('when Swagger document has multiple responses and hooks unskip some of them', ->
    reTransaction = /(\w+): (\w+) \((\d+)\) \/honey/g
    actual = undefined

    before((done) ->
      execCommand(
        options:
          path: './test/fixtures/multiple-responses.yaml'
          hookfiles: './test/fixtures/swagger-multiple-responses.js'
      , (err) ->
        matches = []
        matches.push(groups) while groups = reTransaction.exec(stdout)
        actual = matches.map((match) ->
          keyMap = {'0': 'name', '1': 'action', '2': 'method', '3': 'statusCode'}
          match.reduce((result, element, i) ->
            Object.assign(result, "#{keyMap[i]}": element)
          , {})
        )
        done(err)
      )
    )

    it('recognizes all 6 transactions', ->
      assert.equal(actual.length, 6)
    )

    [
      {action: 'skip', statusCode: '400'}
      {action: 'skip', statusCode: '400'}
      {action: 'fail', statusCode: '200'}
      {action: 'fail', statusCode: '200'}
      {action: 'fail', statusCode: '500'} # Unskipped in hooks
      {action: 'fail', statusCode: '500'} # Unskipped in hooks
    ].forEach((expected, i) ->
      context("the transaction ##{i + 1}", ->
        it("has status code #{expected.statusCode}", ->
          assert.equal(expected.statusCode, actual[i].statusCode)
        )

        defaultMessage = "is #{if expected.action is 'skip' then '' else 'not '}skipped by default"
        unskippedMessage = 'is unskipped in hooks'
        it("#{if expected.statusCode is '500' then unskippedMessage else defaultMessage}", ->
          assert.equal(expected.action, actual[i].action)
        )
      )
    )
  )

  describe('when using Swagger document with hooks', ->
    reTransactionName = /hook: (.+)/g
    matches = undefined

    beforeEach((done) ->
      execCommand(
        options:
          path: './test/fixtures/multiple-responses.yaml'
          hookfiles: './test/fixtures/swagger-transaction-names.js'
      , (err) ->
        matches = []
        matches.push(groups[1]) while groups = reTransactionName.exec(stdout)
        done(err)
      )
    )

    it('transaction names contain status code and content type', ->
      assert.deepEqual(matches, [
        '/honey > GET > 200 > application/json'
        '/honey > GET > 400 > application/json'
        '/honey > GET > 500 > application/json'
      ])
    )
  )
