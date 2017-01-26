{assert} = require 'chai'
sinon = require 'sinon'
express = require 'express'
clone = require 'clone'
fs = require 'fs'
bodyParser = require 'body-parser'

proxyquire = require('proxyquire').noCallThru()

loggerStub = require '../../src/logger'
configUtils = require '../../src/config-utils'

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
  './config-utils': configUtils
  'console': loggerStub
  'fs': fs
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

  describe('When using configuration file', ->
    describe('When specifying custom configuration file by --config', ->
      configPath = '../../custom-dredd-config-path.yaml'
      cmd = {argv: ['--config', configPath]}
      options = {_: ['api-description.apib', 'http://127.0.0.1']}

      fsExistsSync = undefined
      configUtilsLoad = undefined

      before((done) ->
        fsExistsSync = sinon.stub(fs, 'existsSync', -> true)
        configUtilsLoad = sinon.stub(configUtils, 'load', -> options)
        execCommand(cmd, done)
      )
      after( ->
        fsExistsSync.restore()
        configUtilsLoad.restore()
      )

      it('should call fs.existsSync with given path', ->
        assert.isTrue(fsExistsSync.calledWith(configPath))
      )
      it('should call configUtils.load with given path', ->
        assert.isTrue(configUtilsLoad.calledWith(configPath))
      )
      it('should print message about using given configuration file', ->
        assert.include(stdout, "info: Configuration '#{configPath}' found")
      )
    )

    describe('When dredd.yml exists', ->
      configPath = './dredd.yml'
      cmd = {argv: []}
      options = {_: ['api-description.apib', 'http://127.0.0.1']}

      fsExistsSync = undefined
      configUtilsLoad = undefined

      before((done) ->
        fsExistsSync = sinon.stub(fs, 'existsSync', -> true)
        configUtilsLoad = sinon.stub(configUtils, 'load', -> options)
        execCommand(cmd, done)
      )
      after( ->
        fsExistsSync.restore()
        configUtilsLoad.restore()
      )

      it('should call fs.existsSync with dredd.yml', ->
        assert.isTrue(fsExistsSync.calledWith(configPath))
      )
      it('should call configUtils.load with dredd.yml', ->
        assert.isTrue(configUtilsLoad.calledWith(configPath))
      )
      it('should print message about using dredd.yml', ->
        assert.include(stdout, "info: Configuration '#{configPath}' found")
      )
    )

    describe('When dredd.yml does not exist', ->
      configPath = './dredd.yml'
      cmd = {argv: []}
      options = {_: ['api-description.apib', 'http://127.0.0.1']}

      fsExistsSync = undefined
      configUtilsLoad = undefined

      before((done) ->
        fsExistsSync = sinon.stub(fs, 'existsSync', -> false)
        configUtilsLoad = sinon.spy(configUtils, 'load')
        execCommand(cmd, done)
      )
      after( ->
        fsExistsSync.restore()
        configUtilsLoad.restore()
      )

      it('should call fs.existsSync with dredd.yml', ->
        assert.isTrue(fsExistsSync.calledWith(configPath))
      )
      it('should never call configUtils.load', ->
        assert.isFalse(configUtilsLoad.called)
      )
      it('should not print message about using configuration file', ->
        assert.notInclude(stdout, 'info: Configuration')
      )
    )
  )

  describe "to test various Errors - When API description document should be loaded from 'http(s)://...' url", ->
    server = null

    errorCmd = argv: [
      "http://127.0.0.1:#{PORT+1}/connection-error.apib"
      "http://127.0.0.1:#{PORT+1}"
    ]
    wrongCmd = argv: [
      "http://127.0.0.1:#{PORT}/not-found.apib"
      "http://127.0.0.1:#{PORT}"
    ]
    goodCmd = argv: [
      "http://127.0.0.1:#{PORT}/file.apib"
      "http://127.0.0.1:#{PORT}"
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
