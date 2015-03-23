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

describe 'addHooks(runner, transactions)', () ->

  transactions = {}
  server = null

  before () ->
    loggerStub.transports.console.silent = true

  after () ->
    loggerStub.transports.console.silent = false

  describe 'with no pattern', () ->

    runner = null

    beforeEach () ->
      runner =
        configuration:
          options:
            hookfiles: null
      sinon.spy globStub, 'sync'

    afterEach () ->
      globStub.sync.restore()

    it 'should not expand any glob', ()->
      addHooks(runner, transactions)
      assert.ok globStub.sync.notCalled

    it 'should create hooks instance at runner.hooks', ->
      hooks = addHooks(runner, transactions)
      assert.isDefined hooks
      assert.instanceOf hooks, hooksStub
      assert.deepProperty runner, 'hooks.transactions'


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
