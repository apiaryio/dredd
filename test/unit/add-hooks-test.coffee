require 'coffee-errors'
{assert} = require 'chai'
proxyquire = require 'proxyquire'
sinon = require 'sinon'
clone = require 'clone'

globStub = require 'glob'
pathStub = require 'path'
loggerStub = require '../../src/logger'
hooksStub = require '../../src/hooks'

addHooks = proxyquire  '../../src/add-hooks', {
  'logger': loggerStub,
  'glob': globStub,
  'pathStub': pathStub,
  'hooks': hooksStub
}

describe 'addHooks(runner, transactions, emitter, customConfig)', () ->

  transactions = {}
  server = null

  before () ->
    loggerStub.transports.console.silent = true

  after () ->
    loggerStub.transports.console.silent = false

  describe 'constructor', ->
    runner =
      configuration:
        options:
          hookfiles: null

    it 'should create hooks instance at runner.hooks', ->
      hooks = addHooks(runner, transactions)
      assert.isDefined hooks
      assert.instanceOf hooks, hooksStub
      assert.strictEqual hooks, runner.hooks
      assert.deepProperty runner, 'hooks.transactions'

  describe 'with no pattern', () ->

    runner = null

    before () ->
      runner =
        configuration:
          options:
            hookfiles: null

      sinon.spy globStub, 'sync'

    after () ->
      globStub.sync.restore()

    it 'should not expand any glob', ()->
      addHooks(runner, transactions)
      assert.ok globStub.sync.notCalled

  describe 'with valid pattern', () ->
    runner = null
    runnerSource =
      configuration:
        options:
          hookfiles: './**/*_hooks.*'

    before ->
      runner = clone runnerSource

    it 'should return files', () ->
      sinon.spy globStub, 'sync'
      addHooks(runner, transactions)
      assert.ok globStub.sync.called
      globStub.sync.restore()

    describe 'when files are valid js/coffeescript', () ->
      before () ->
        runner = clone(runnerSource)
        sinon.stub globStub, 'sync', (pattern) ->
          ['file1.js', 'file2.coffee']
        sinon.stub pathStub, 'resolve', (path, rel) ->
          ""

      after () ->
        globStub.sync.restore()
        pathStub.resolve.restore()

      it 'should load the files', () ->
        addHooks(runner, transactions)
        assert.ok pathStub.resolve.called

    describe 'when there is an error reading the hook files', () ->

      beforeEach ->
        runner = clone(runnerSource)
        sinon.stub pathStub, 'resolve', (path, rel) ->
          throw new Error()
        sinon.spy loggerStub, 'warn'
        sinon.spy loggerStub, 'info'
        sinon.stub globStub, 'sync', (pattern) ->
          ['file1.xml', 'file2.md']

      afterEach ->
        pathStub.resolve.restore()
        loggerStub.warn.restore()
        loggerStub.info.restore()
        globStub.sync.restore()

      it 'should log an info with hookfiles paths', ->
        addHooks(runner, transactions)
        assert.ok loggerStub.info.called
        assert.equal loggerStub.info.firstCall.args[0], 'Found Hookfiles: file1.xml,file2.md'

      it 'should log a warning', ->
        addHooks(runner, transactions)
        assert.ok loggerStub.warn.called


  describe 'when sandbox is turned on', () ->

    runner = null
    runnerSource =
      configuration:
        options:
          hookfiles: './**/*_hooks.*'
          sandbox: true

    before ->
      runner = clone runnerSource

    it 'should add hooks on the runner object'

    describe 'all hooks functions on the runner object', () ->
      it 'should be strings'

    desribe 'when hook loading explodes', () ->
      it 'should log a warning'

    describe 'context of code adding hooks', () ->
      it 'should not have access to addHooks context'
      it 'should not have access to require'
      it 'should have defined before'
      it 'should have defined after'
      it 'should have defined beforeAll'
      it 'should have defined afterAll'

    describe 'when hook code is provided as string in Dredd\'s options', () ->
      it 'shuold eval and load the code from the array'

  describe 'when code is provided as a string in Dredd\'s options', () ->
    describe 'when sendbox mode is off' () ->
      it 'should throw an error containing descriptive error'
      # passing hooks code text must be used in 'sandbox' mode
