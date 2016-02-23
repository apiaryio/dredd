{assert} = require 'chai'
sinon = require 'sinon'
express = require 'express'
proxyquire = require('proxyquire').noCallThru()

options = require '../../src/options'
packageJson = require '../../package.json'

childProcessStub = require 'child_process'
loggerStub = require '../../src/logger'
interactiveConfigStub = require '../../src/interactive-config'
configUtilsStub = require '../../src/config-utils'
fsStub = require 'fs'

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
  './logger': loggerStub
  './interactive-init': interactiveConfigStub
  'child_process': childProcessStub
  './config-utils': configUtilsStub
  'fs': fsStub
}


execCommand = (custom = {}, cb) ->
  stdout = ''
  stderr = ''
  exitStatus = null
  finished = false
  dreddCommand = new DreddCommand({
    custom: custom
  }, (code) ->
    if not finished
      finished = true
      exitStatus = (code ? 0)
      cb null, stdout, stderr, (code ? 0)
  ).run()
  return

describe "DreddCommand class", () ->
  dreddCommand = null
  env = {}

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


  describe 'when initialized without "new" keyword', ->
    dc = null
    before ->
      dc = new DreddCommand

    it 'sets finished to false', ->
      assert.isFalse dc.finished

    it 'sets custom to an Object with "argv" and "cwd" keys', ->
      assert.isObject dc.custom
      assert.lengthOf Object.keys(dc.custom), 2
      assert.property dc.custom, 'cwd'
      assert.property dc.custom, 'argv'

    it 'sets custom argv to an Array with process.argv', ->
      assert.isArray dc.custom?.argv
      assert.equal dc.custom?.argv.length, 0

    it 'returns an instanceof DreddCommand', ->
      assert.instanceOf dc, DreddCommand


  describe 'when initialized with options containing exit callback', ->
    dc = null
    hasCalledExit = null

    before () ->
      dc = new DreddCommand {exit: (code) ->
        hasCalledExit = true
      }
      dc.run()

    it 'has argv property set to object with properties from optimist', ->
      assert.isObject dc.argv
      assert.property dc.argv, '_'
      assert.isArray dc.argv['_']

    it 'should set finished to true (keeps false)', ->
      assert.isTrue dc.finished

    it 'ends with an error message about missing blueprint-file', ->
      assert.include stderr, 'Must specify path to blueprint file.'

    it 'ends with an error message about missing api endpoint.', ->
      assert.include stderr, 'Must specify api endpoint.'

    it 'calls exit callback', ->
      assert.isNotNull hasCalledExit


  describe 'run', ->
    dc = null
    initDreddStub = null
    initConfigSpy = null
    lastArgvIsApiEndpointSpy = null
    takeRestOfParamsAsPathSpy = null

    before ->
      dc = new DreddCommand({
        exit: ->
        custom:
          argv: ['./file.apib', 'http://localhost:3000']
          env: {'NO_KEY': 'NO_VAL'}
      })

      initDreddStub = sinon.stub dc, 'initDredd', (configuration) ->
        dredd = new dreddStub configuration
        sinon.stub dredd, 'run'
        return dredd

      initConfigSpy = sinon.spy dc, 'initConfig'
      lastArgvIsApiEndpointSpy = sinon.spy dc, 'lastArgvIsApiEndpoint'
      takeRestOfParamsAsPathSpy = sinon.spy dc, 'takeRestOfParamsAsPath'

    after ->
      dc.initDredd.restore()
      dc.initConfig.restore()
      dc.lastArgvIsApiEndpoint.restore()
      dc.takeRestOfParamsAsPath.restore()

    describe 'with mocked initDredd', ->
      before ->
        dc.run()

      it 'should call initConfig', ->
        assert.equal initConfigSpy.called, 1

      it 'should call susequent helpers as part of initConfig', ->
        assert.equal lastArgvIsApiEndpointSpy.called, 1
        assert.equal takeRestOfParamsAsPathSpy.called, 1

      it 'should call initDredd with configuration object', ->
        assert.equal dc.initDredd.called, 1
        assert.isArray dc.initDredd.firstCall.args
        assert.lengthOf dc.initDredd.firstCall.args, 1
        assert.property dc.initDredd.firstCall.args[0], 'server'
        assert.property dc.initDredd.firstCall.args[0], 'options'
        assert.property dc.initDredd.firstCall.args[0], 'custom'

        assert.isObject dc.dreddInstance

  describe 'run with argv set to load regular blueprint', ->
    dc = null
    runDreddStub = null
    returnGood = true

    beforeEach (done) ->
      app = express()

      app.get '/machines', (req, res) ->
        if returnGood
          res.type('json').status(200).send [type: 'bulldozer', name: 'willy']
        else
          res.type('json').status(200).send [my: 'another', world: 'service']

      dc = new DreddCommand({
        custom:
          argv: [
            './test/fixtures/single-get.apib'
            "http://localhost:#{PORT}"
            '--path=./test/fixtures/single-get.apib'
          ]
        exit: (code) ->
          exitStatus = code
          server.close()
      })

      server = app.listen PORT, () ->
        dc.run()

      server.on 'close', done

    describe 'with server returning good things', ->
      before ->
        returnGood = true

      it 'returns exit code 0', ->
        assert.equal exitStatus, 0

      it 'propagates configuration options to Dredd class', ->
        assert.equal dc.dreddInstance.configuration.options.path[0], "./test/fixtures/single-get.apib"
        assert.equal dc.dreddInstance.configuration.server, "http://localhost:#{PORT}"

    describe 'with server returning wrong things', ->

      before ->
        returnGood = false

      it 'returns exit code 1', ->
        assert.equal exitStatus, 1

      it 'propagates configuration options to Dredd class', ->
        assert.equal dc.dreddInstance.configuration.options.path[0], "./test/fixtures/single-get.apib"
        assert.equal dc.dreddInstance.configuration.server, "http://localhost:#{PORT}"


  describe "when called w/ OR wo/ exiting arguments", () ->
    describe '--help', ->
      before (done) ->
        execCommand argv: ['--help'], ->
          done()

      it 'prints out some really nice help text with all options descriptions', ->
        assert.include stderr, 'Usage:'
        assert.include stderr, 'Example:'
        assert.include stderr, '[OPTIONS]'
        for optionKey in Object.keys options then do (optionKey) ->
          assert.include stderr, optionKey

    describe '--version', ->
      before (done) ->
        execCommand argv: ['--version'], ->
          done()

      it 'prints out version', ->
        assert.include stdout, "#{packageJson.name} v#{packageJson.version}"

    describe '"init" (nodejs)', ->
      before (done) ->
        sinon.stub interactiveConfigStub, 'run', (argv, cb) ->
          cb({language: 'nodejs'})
        sinon.stub configUtilsStub, 'save'
        execCommand argv: ['init'], ->
          done()

      after () ->
        interactiveConfigStub.run.restore()
        configUtilsStub.save.restore()

      it 'should run interactive config', ->
        assert.isTrue interactiveConfigStub.run.called

      it 'should save configuration', ->
        assert.isTrue configUtilsStub.save.called

    describe '"init" (python)', ->
      before (done) ->
        sinon.stub interactiveConfigStub, 'run', (argv, cb) ->
          cb({language: 'python'})
        sinon.stub configUtilsStub, 'save'
        execCommand argv: ['init'], ->
          done()

      after () ->
        interactiveConfigStub.run.restore()
        configUtilsStub.save.restore()

      it 'should run interactive config', ->
        assert.isTrue interactiveConfigStub.run.called

      it 'should save configuration', ->
        assert.isTrue configUtilsStub.save.called


    describe '"init" (php)', ->
      before (done) ->
        sinon.stub interactiveConfigStub, 'run', (argv, cb) ->
          cb({language: 'php'})
        sinon.stub configUtilsStub, 'save'
        execCommand argv: ['init'], ->
          done()

      after () ->
        interactiveConfigStub.run.restore()
        configUtilsStub.save.restore()

      it 'should run interactive config', ->
        assert.isTrue interactiveConfigStub.run.called

      it 'should save configuration', ->
        assert.isTrue configUtilsStub.save.called

    describe '"init" (perl)', ->
      before (done) ->
        sinon.stub interactiveConfigStub, 'run', (argv, cb) ->
          cb({language: 'perl'})
        sinon.stub configUtilsStub, 'save'
        execCommand argv: ['init'], ->
          done()

      after () ->
        interactiveConfigStub.run.restore()
        configUtilsStub.save.restore()

      it 'should run interactive config', ->
        assert.isTrue interactiveConfigStub.run.called

      it 'should save configuration', ->
        assert.isTrue configUtilsStub.save.called

    describe 'without argv', ->
      before (done) ->
        execCommand argv: [], ->
          done()

      it 'prints out an error message', ->
        assert.include stderr, 'Error: Must specify'


  describe 'when configuration was saved', () ->
    before (done) ->
      sinon.spy dreddStub.prototype, 'init'
      sinon.stub dreddStub.prototype, 'run', (cb) ->
        stats =
          tests: 0
          failures: 0
          errors: 0
          passes: 0
          skipped: 0
          start: 0
          end: 0
          duration: 0
        cb(null, stats)

      sinon.stub interactiveConfigStub, 'run', (config, cb) ->
        cb()

      sinon.stub fsStub, 'existsSync', () -> true

      sinon.stub configUtilsStub, 'load', () ->
        {
          "_": [ 'blueprint', 'endpoint' ]
          'dry-run': true
          hookfiles: null
          sandbox: false
          save: null
          load: null
          server: null
          init: false
          custom: []
          names: false
          only: []
          reporter: []
          output: []
          header: []
          sorted: false
          user: null
          'inline-errors': false
          details: false
          method: []
          color: true
          level: 'info'
          timestamp: false
          silent: false
          path: []
          '$0': 'node ./bin/dredd'
        }

      execCommand argv: ['--names'], ->
        done()

    after () ->
      dreddStub.prototype.run.restore()
      dreddStub.prototype.init.restore()
      interactiveConfigStub.run.restore()
      configUtilsStub.load.restore()
      fsStub.existsSync.restore()

    describe 'and I pass another CLI argument', () ->
      it 'should want to exit with status 0', () ->
        assert.equal exitStatus, 0

      it 'should call dredd run', () ->
        assert.isTrue dreddStub.prototype.run.called

      it 'should override existing configuration', () ->
        assert.isTrue dreddStub.prototype.init.called
        call = dreddStub.prototype.init.getCall(0)
        passedConf = call.args[0]
        assert.propertyVal passedConf.options, 'names', true

  # describe 'when using --server', () ->

  #   beforeEach (done) ->

  #     sinon.stub childProcessStub, 'exec'
  #     sinon.stub transactionRunner.prototype, 'executeAllTransactions', (cb) -> cb()
  #     dc = new DreddCommand({
  #       exit: (status) ->
  #         done()

  #       custom:
  #         argv: [
  #           "./test/fixtures/single-get.apib"
  #           "http://localhost:#{PORT}"
  #           "--server"
  #           "./test/fixtures/scripts/fake-server.sh"
  #         ]
  #     }).run()

  #   afterEach () ->
  #     childProcessStub.exec.restore()


  #   it 'stdout shoud run child process', () ->
  #     assert.isTrue childProcessStub.exec.called
