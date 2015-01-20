require 'coffee-errors'
{assert} = require 'chai'
{EventEmitter} = require 'events'
nock = require 'nock'
proxyquire = require 'proxyquire'
sinon = require 'sinon'

globStub = require 'glob'
pathStub = require 'path'
loggerStub = require '../../src/logger'
hooksStub = require '../../src/hooks'
Runner = require '../../src/transaction-runner'

addHooks = proxyquire  '../../src/add-hooks', {
  'logger': loggerStub,
  'glob': globStub,
  'pathStub': pathStub,
  'hooks': hooksStub
}

describe 'addHooks(runner, transaction)', () ->

  transactions = {}

  before () ->
    loggerStub.transports.console.silent = true

  after () ->
    loggerStub.transports.console.silent = false

  describe 'with no pattern', () ->

    before () ->
      sinon.spy globStub, 'sync'

    after () ->
      globStub.sync.restore()

    it 'should return immediately', ()->
      addHooks("", transactions)
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

      it 'should attach the hooks', () ->
        # can't stub proxyquire, so we skip it by forcing files to be empty
        sinon.restore globStub.sync
        sinon.stub globStub, 'sync', (pattern) ->
          []
        addHooks(runner, transactions)
        assert.ok runner.before.calledWith 'executeTransaction'
        assert.ok runner.after.calledWith 'executeTransaction'
        assert.ok runner.before.calledWith 'executeAllTransactions'
        assert.ok runner.after.calledWith 'executeAllTransactions'


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

      it 'should log an warning', () ->
        addHooks(runner, transactions)
        assert.ok loggerStub.warn.called

      it 'should not attach the hooks', () ->
        addHooks(runner, transactions)
        assert.ok runner.before.notCalled
        assert.ok runner.after.notCalled

    describe 'when a transaction is executed', () ->

      configuration =
        server: 'http://localhost:3000'
        emitter: new EventEmitter()
        options:
          'dry-run': false
          method: []
          header: []
          reporter:  []
          only: []
          hookfiles: './**/*_hooks.*'

      transaction =
        name: 'Group Machine > Machine > Delete Message > Bogus example name'
        id: 'POST /machines'
        host: 'localhost'
        port: '3000'
        request:
          body: '{\n  "type": "bulldozer",\n  "name": "willy"}\n'
          headers:
            'Content-Type': 'application/json'
            'User-Agent': 'Dredd/0.2.1 (Darwin 13.0.0; x64)'
            'Content-Length': 44
          uri: '/machines'
          method: 'POST'
        expected:
          headers: 'content-type': 'application/json'
          body: '{\n  "type": "bulldozer",\n  "name": "willy",\n  "id": "5229c6e8e4b0bd7dbb07e29c"\n}\n'
          status: '202'
        origin:
          resourceGroupName: 'Group Machine'
          resourceName: 'Machine'
          actionName: 'Delete Message'
          exampleName: 'Bogus example name'
        fullPath: '/machines'

      beforeEach () ->
        server = nock('http://localhost:3000').
          post('/machines', {"type":"bulldozer","name":"willy"}).
          reply transaction['expected']['status'],
            transaction['expected']['body'],
            {'Content-Type': 'application/json'}
        runner = new Runner(configuration)
        sinon.stub globStub, 'sync', (pattern) ->
          []

      afterEach () ->
        globStub.sync.restore()
        nock.cleanAll()

      describe 'with hooks', () ->
        beforeEach () ->
          sinon.spy loggerStub, 'info'
          hooksStub.beforeHooks =
            'Group Machine > Machine > Delete Message > Bogus example name' : [
              (transaction) ->
                loggerStub.info "before"
            ]
          hooksStub.afterHooks =
            'Group Machine > Machine > Delete Message > Bogus example name' : [
              (transaction, done) ->
                loggerStub.info "after"
                done()
            ]

        afterEach () ->
          loggerStub.info.restore()

        it 'should run the hooks', (done) ->
          runner.executeTransaction transaction, () ->
            assert.ok loggerStub.info.calledWith "before"
            assert.ok loggerStub.info.calledWith "after"
            done()

      describe 'with multiple hooks for the same transaction', () ->
        beforeEach () ->
          sinon.spy loggerStub, 'info'
          hooksStub.beforeHooks =
            'Group Machine > Machine > Delete Message > Bogus example name' : [
              (transaction) ->
                loggerStub.info "first",
              (transaction, cb) ->
                loggerStub.info "second"
                cb()
            ]

        afterEach () ->
          loggerStub.info.restore()

        it 'should run all hooks', (done) ->
          runner.executeTransaction transaction, () ->
            assert.ok loggerStub.info.calledWith "first"
            assert.ok loggerStub.info.calledWith "second"
            done()

      describe 'with a beforeAll hook', () ->
        beforeAll = sinon.stub()
        beforeAll.callsArg(0)

        before () ->
          hooksStub.beforeAll beforeAll

        after () ->
          hooksStub.beforeAllHooks = []

        it 'should run the hooks', (done) ->
          runner.executeAllTransactions [], () ->
            assert.ok beforeAll.called
            done()

      describe 'with an afterAll hook', () ->
        afterAll = sinon.stub()
        afterAll.callsArg(0)

        before () ->
          hooksStub.afterAll afterAll

        after () ->
          hooksStub.afterAllHooks = []

        it 'should run the hooks', (done) ->
          runner.executeAllTransactions [], () ->
            assert.ok afterAll.called
            done()

      describe 'with multiple hooks for the same events', () ->
        beforeAll1 = sinon.stub()
        beforeAll2 = sinon.stub()
        afterAll1 = sinon.stub()
        afterAll2 = sinon.stub()

        before () ->
          beforeAll1.callsArg(0)
          beforeAll2.callsArg(0)
          afterAll1.callsArg(0)
          afterAll2.callsArg(0)

        beforeEach () ->
          hooksStub.beforeAll beforeAll1
          hooksStub.afterAll afterAll1
          hooksStub.afterAll afterAll2
          hooksStub.beforeAll beforeAll2

        after () ->
          hooksStub.beforeAllHooks = []
          hooksStub.afterAllHooks = []

        it 'should run all the events in order', (done) ->
          runner.executeAllTransactions [], () ->
            assert.ok beforeAll1.calledBefore(beforeAll2)
            assert.ok beforeAll2.called
            assert.ok afterAll1.calledBefore(afterAll2)
            assert.ok afterAll2.called
            done()

      describe 'with hook that throws an error', () ->
        beforeEach () ->
          hooksStub.beforeHooks =
            'Group Machine > Machine > Delete Message > Bogus example name' : [
              (transaction) ->
                JSON.parse '<<<>>>!@#!@#!@#4234234'
            ]
          sinon.stub configuration.emitter, 'emit'

        after () ->
          configuration.emitter.emit.restore()

        it 'should report an error with the test', (done) ->
          runner.executeTransaction transaction, () ->
            assert.ok emitter.emit.calledWith "test error"
            done()

      describe 'without hooks', () ->
        beforeEach () ->
          hooksStub.beforeHooks = []
          hooksStub.afterHooks = []

        it 'should not run the hooks', (done) ->
          runner.executeTransaction transaction, () ->
            done()
