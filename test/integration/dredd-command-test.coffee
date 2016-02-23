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
dreddStub = proxyquire '../../src/dredd', {
  './transaction-runner': transactionRunner
  './logger': loggerStub
}
DreddCommand = proxyquire '../../src/dredd-command', {
  './dredd': dreddStub
  'console': loggerStub
}

execCommand = (custom = {}, cb) ->
  stdout = ''
  stderr = ''
  exitStatus = null
  finished = false
  dreddCommand = new DreddCommand {custom: custom}, (exitStatusCode) ->
    if not finished
      finished = true
      exitStatus = (exitStatusCode ? 0)
      cb null, stdout, stderr, (exitStatusCode ? 0)


  dreddCommand.run()
  return

describe "DreddCommand class Integration", () ->
  dreddCommand = null
  custom = {}

  before ->
    for method in ['warn', 'error'] then do (method) ->
      sinon.stub loggerStub, method, (chunk) -> stderr += "\n#{method}: #{chunk}"
    for method in ['log', 'info', 'silly', 'verbose', 'test', 'hook', 'complete', 'pass', 'skip', 'debug', 'fail', 'request', 'expected', 'actual'] then do (method) ->
      sinon.stub loggerStub, method, (chunk) -> stdout += "\n#{method}: #{chunk}"
    return

  after ->
    for method in ['warn', 'error']
      loggerStub[method].restore()
    for method in ['log', 'info', 'silly', 'verbose', 'test', 'hook', 'complete', 'pass', 'skip', 'debug', 'fail', 'request', 'expected', 'actual']
      loggerStub[method].restore()
    return


  describe "to test various Errors - When blueprint file should be loaded from 'http(s)://...' url", ->
    server = null

    errorCmd = argv: [
      "http://localhost:#{PORT+1}/connection-error.apib"
      "http://localhost:#{PORT+1}"
    ]
    wrongCmd = argv: [
      "http://localhost:#{PORT}/not-found.apib"
      "http://localhost:#{PORT}"
    ]
    goodCmd = argv: [
      "http://localhost:#{PORT}/file.apib"
      "http://localhost:#{PORT}"
    ]

    before (done) ->
      app = express()

      app.get '/', (req, res) -> res.sendStatus 404

      app.get '/file.apib', (req, res) ->
        stream = fs.createReadStream('./test/fixtures/single-get.apib')
        stream.pipe res.type('text')

      app.get '/machines', (req, res) ->
        res.type('json').status(200).send [type: 'bulldozer', name: 'willy']

      app.get '/not-found.apib', (req, res) ->
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

      it 'should exit with status 0', ->
        assert.equal exitStatus, 0

