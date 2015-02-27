require 'coffee-errors'
{assert} = require 'chai'
{EventEmitter} = require 'events'
proxyquire = require 'proxyquire'
sinon = require 'sinon'

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

describe 'addHooks(runner, transaction)', () ->

  transactions = {}
  server = null

  before () ->
    loggerStub.transports.console.silent = true

  after () ->
    loggerStub.transports.console.silent = false

  describe 'with no pattern', () ->

    before () ->
      sinon.spy globStub, 'sync'

    after () ->
      globStub.sync.restore()

    it 'should not expand any glob', ()->
      runner =
        configuration:
          options:
            hookfiles: null
        before: (fn, cb) ->
          return
        after: (fn, cb) ->
          return
      addHooks(runner, transactions, new EventEmitter())
      assert.ok globStub.sync.notCalled


  describe 'with valid pattern', () ->

    runner =
      configuration:
        options:
          hookfiles: './**/*_hooks.*'
      before: (fn, cb) ->
        return
      after: (fn, cb) ->
        return

    it 'should return files', () ->
      sinon.spy globStub, 'sync'
      addHooks(runner, transactions)
      assert.ok globStub.sync.called
      globStub.sync.restore()

    describe 'when files are valid js/coffeescript', () ->

      beforeEach () ->
        sinon.spy runner, 'before'
        sinon.spy runner, 'after'
        sinon.stub globStub, 'sync', (pattern) ->
          ['file1.js', 'file2.coffee']
        sinon.stub pathStub, 'resolve', (path, rel) ->
          ""

      afterEach () ->
        runner.before.restore()
        runner.after.restore()
        globStub.sync.restore()
        pathStub.resolve.restore()

      it 'should load the files', () ->
        addHooks(runner, transactions)
        assert.ok pathStub.resolve.called

    describe 'when there is an error reading the hook files', () ->

      beforeEach () ->
        sinon.stub pathStub, 'resolve', (path, rel) ->
          throw new Error()
        sinon.spy loggerStub, 'warn'
        sinon.spy runner, 'before'
        sinon.spy runner, 'after'
        sinon.stub globStub, 'sync', (pattern) ->
          ['file1.xml', 'file2.md']

      afterEach () ->
        pathStub.resolve.restore()
        loggerStub.warn.restore()
        runner.before.restore()
        runner.after.restore()
        globStub.sync.restore()

      it 'should log a warning', () ->
        addHooks(runner, transactions)
        assert.ok loggerStub.warn.called
