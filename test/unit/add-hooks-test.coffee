require 'coffee-errors'
{assert} = require 'chai'
proxyquire = require 'proxyquire'
sinon = require 'sinon'
clone = require 'clone'

globStub = require 'glob'
pathStub = require 'path'
loggerStub = require '../../src/logger'
hooksStub = require '../../src/hooks'

proxyquireStub = require 'proxyquire'
proxyquireSpy = sinon.spy proxyquireStub.noCallThru()
proxyquireStub.noCallThru = () ->
  proxyquireSpy

sandboxHooksCodeSpy = sinon.spy require '../../src/sandbox-hooks-code'
fsStub = require 'fs'

addHooks = proxyquire  '../../src/add-hooks', {
  'logger': loggerStub,
  'glob': globStub,
  'pathStub': pathStub,
  'hooks': hooksStub,
  'proxyquire': proxyquireStub
  './sandbox-hooks-code': sandboxHooksCodeSpy
  'fs': fsStub
}

describe 'addHooks(runner, transactions, callback)', () ->

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

    it 'should create hooks instance at runner.hooks', (done)->
      addHooks runner, transactions, (err) ->
        return err if err
        assert.isDefined runner.hooks
        assert.instanceOf runner.hooks, hooksStub
        assert.strictEqual runner.hooks, runner.hooks
        assert.deepProperty runner, 'hooks.transactions'
        done()

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

    it 'should not expand any glob', (done) ->
      addHooks runner, transactions, (err) ->
        assert.ok globStub.sync.notCalled
        done()

  describe 'with valid pattern', () ->
    runner = null
    beforeEach ->
      runner =
        configuration:
          options:
            hookfiles: './**/*_hooks.*'

    it 'should return files', (done) ->
      sinon.spy globStub, 'sync'
      addHooks runner, transactions, (err) ->
        return done err if err
        assert.ok globStub.sync.called
        globStub.sync.restore()
        done()

    describe 'when files are valid js/coffeescript', () ->
      runner = null
      before () ->
        runner =
          configuration:
            options:
              hookfiles: './**/*_hooks.*'
        sinon.stub globStub, 'sync', (pattern) ->
          ['file1.js', 'file2.coffee']
        sinon.stub pathStub, 'resolve', (path, rel) ->
          ""

      after () ->
        globStub.sync.restore()
        pathStub.resolve.restore()

      it 'should load the files', (done) ->
        addHooks runner, transactions, (err) ->
          return done err if err
          assert.ok pathStub.resolve.called
          done()

    describe 'when there is an error reading the hook files', () ->
      runner = null
      beforeEach ->
        runner =
          configuration:
            options:
              hookfiles: './**/*_hooks.*'

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

      it 'should log an info with hookfiles paths', (done) ->
        addHooks runner, transactions, (err) ->
          return done err if err
          assert.ok loggerStub.info.called
          assert.equal loggerStub.info.firstCall.args[0], 'Found Hookfiles: file1.xml,file2.md'
          done()

      it 'should log a warning', (done) ->
        addHooks runner, transactions, (err) ->
          return done err if err
          assert.ok loggerStub.warn.called
          done()

  describe 'when sandboxed mode is off', () ->
    describe 'when hooks are passed as a string from Dredd class', () ->
      it 'should throw a "not implemented" exception'

  describe 'when sandboxed mode is on', () ->
    describe 'when hookfiles option is given', () ->
      runner = {}
      beforeEach ->
        runner =
          configuration:
            options:
              hookfiles: './test/fixtures/sandboxed-hook.js'
              sandbox: true

        sinon.spy loggerStub, 'warn'
        sinon.spy loggerStub, 'info'
        sinon.spy fsStub, 'readFile'
        proxyquireSpy.reset()
        sandboxHooksCodeSpy.reset()

      afterEach ->
        loggerStub.warn.restore()
        loggerStub.info.restore()
        fsStub.readFile.restore()
        proxyquireSpy.reset()
        sandboxHooksCodeSpy.reset()

      it 'should not use proxyquire', (done) ->
        addHooks runner, transactions, (err) ->
          return done err if err
          assert.isFalse proxyquireSpy.called
          done()

      it 'should load files from the filesystem', (done) ->
        addHooks runner, transactions, (err) ->
          return done err if err
          assert.isTrue fsStub.readFile.called
          done()

      it 'should run the loaded code', (done) ->
        addHooks runner, transactions, (err) ->
          return err if err
          assert.isTrue sandboxHooksCodeSpy.called
          done()

      it 'should add hook functions strings to the runner object', (done) ->
        addHooks runner, transactions, (err) ->
          return err if err
          assert.property runner.hooks.beforeHooks, 'Machines > Machines collection > Get Machines'
          done()

    describe 'when hooks are passed as string from Dredd class', () ->
      it 'should run given code'
      it 'should add hook functions strings to the runner object '

    describe 'when multiple hook files and hook code strings are processed', () ->
      it 'should not overwrite previous content of hooks'
