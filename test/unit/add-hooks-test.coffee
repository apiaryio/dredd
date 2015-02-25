require 'coffee-errors'
{assert} = require 'chai'
{EventEmitter} = require 'events'
nock = require 'nock'
proxyquire = require 'proxyquire'
sinon = require 'sinon'
express = require 'express'
bodyParser = require 'body-parser'

globStub = require 'glob'
pathStub = require 'path'
loggerStub = require '../../src/logger'
hooksStub = require '../../src/hooks'


Runner = proxyquire '../../src/transaction-runner',  {
  'logger': loggerStub
}


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

      it 'should log an warning', () ->
        addHooks(runner, transactions)
        assert.ok loggerStub.warn.called

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

      transaction = {}

      beforeEach () ->
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
            statusCode: '202'
          origin:
            resourceGroupName: 'Group Machine'
            resourceName: 'Machine'
            actionName: 'Delete Message'
            exampleName: 'Bogus example name'
          fullPath: '/machines'

        server = nock('http://localhost:3000').
          post('/machines', {"type":"bulldozer","name":"willy"}).
          reply transaction['expected']['statusCode'],
            transaction['expected']['body'],
            {'Content-Type': 'application/json'}
        runner = new Runner(configuration)
        runner.addHooks()
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
          runner.executeAllTransactions [transaction], hooksStub, () ->
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
          runner.executeAllTransactions [transaction], hooksStub, () ->
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
          runner.executeAllTransactions [], hooksStub, () ->
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
          runner.executeAllTransactions [], hooksStub, () ->
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
          runner.executeAllTransactions [], hooksStub, () ->
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
          hooksStub.beforeHooks = {}
          hooksStub.afterHooks = {}

        it 'should report an error with the test', (done) ->
          runner.executeAllTransactions [transaction], hooksStub, () ->
            assert.ok configuration.emitter.emit.calledWith "test error"
            done()

      describe 'with hook failing the transaction', () ->
        describe 'in before hook', () ->
          beforeEach () ->
            hooksStub.beforeHooks =
              'Group Machine > Machine > Delete Message > Bogus example name' : [
                (transaction) ->
                  transaction.fail = "Message before"
              ]
            sinon.stub configuration.emitter, 'emit'

          afterEach () ->
            configuration.emitter.emit.restore()
            hooksStub.beforeHooks = {}
            hooksStub.afterHooks = {}

          it 'should fail the test', (done) ->
            runner.executeAllTransactions [transaction], hooksStub, () ->
              assert.ok configuration.emitter.emit.calledWith "test fail"
              done()

          it 'should not run the transaction', (done) ->
            runner.executeAllTransactions [transaction], hooksStub, () ->
              assert.notOk server.isDone()
              done()

          it 'should pass the failing message to the emitter', (done) ->
            runner.executeAllTransactions [transaction], hooksStub, () ->
              messages = []
              callCount = configuration.emitter.emit.callCount
              for callNo in [0.. callCount - 1]
                messages.push configuration.emitter.emit.getCall(callNo).args[1].message
              assert.include messages.join(), "Message before"
              done()

            it 'should mention before hook in the error message', (done) ->
              runner.executeAllTransactions [transaction], hooksStub, () ->
                messages = []
                callCount = configuration.emitter.emit.callCount
                for callNo in [0.. callCount - 1]
                  messages.push configuration.emitter.emit.getCall(callNo).args[1].message
                assert.include messages, "Failed in before hook:"
                done()

          describe 'when message is set to fail also in after hook', () ->
            beforeEach () ->
              hooksStub.afterHooks =
                'Group Machine > Machine > Delete Message > Bogus example name' : [
                  (transaction) ->
                    transaction.fail = "Message after"
                ]

            afterEach () ->
              hooksStub.afterHooks = {}

            it 'should pass the failing message to the emitter', (done) ->
              runner.executeAllTransactions [transaction], hooksStub, () ->
                messages = []
                callCount = configuration.emitter.emit.callCount
                for callNo in [0.. callCount - 1]
                  messages.push configuration.emitter.emit.getCall(callNo).args[1].message
                assert.notInclude messages, "Message after fail"
                done()

            it 'should not mention after hook in the error message', (done) ->
              runner.executeAllTransactions [transaction], hooksStub, () ->
                messages = []
                callCount = configuration.emitter.emit.callCount
                for callNo in [0.. callCount - 1]
                  messages.push configuration.emitter.emit.getCall(callNo).args[1].message
                assert.notInclude messages, "Failed in after hook:"
                done()

        describe 'in after hook when transaction fails ', () ->
          modifiedTransaction = {}
          beforeEach () ->
            modifiedTransaction = JSON.parse(JSON.stringify(transaction))
            modifiedTransaction['expected']['statusCode'] = "303"

            hooksStub.beforeHooks = {}
            hooksStub.afterHooks =
              'Group Machine > Machine > Delete Message > Bogus example name' : [
                (transaction) ->
                  transaction.fail = "Message after fail"
              ]
            sinon.stub configuration.emitter, 'emit'

          afterEach () ->
            configuration.emitter.emit.reset()
            configuration.emitter.emit.restore()
            hooksStub.afterHooks = {}

          it 'should make the request', (done) ->
            runner.executeAllTransactions [transaction], hooksStub, () ->
              assert.ok server.isDone()
              done()

          it 'should not fail again', (done) ->
            runner.executeAllTransactions [modifiedTransaction], hooksStub, () ->
              failCount = 0
              messages = []
              callCount = configuration.emitter.emit.callCount
              for callNo in [0.. callCount - 1]
                failCount++ if configuration.emitter.emit.getCall(callNo).args[0] == 'test fail'
                messages.push configuration.emitter.emit.getCall(callNo).args[1].message
              assert.equal failCount, 1
              done()

          it 'should not pass the hook message to the emitter', (done) ->
            runner.executeAllTransactions [modifiedTransaction], hooksStub, () ->
              messages = []
              callCount = configuration.emitter.emit.callCount
              for callNo in [0.. callCount - 1]
                messages.push configuration.emitter.emit.getCall(callNo).args[1].message
              assert.notInclude messages, "Message after fail"
              done()

            it 'should not mention after hook in the error message', (done) ->
              runner.executeAllTransactions [transaction], hooksStub, () ->
                messages = []
                callCount = configuration.emitter.emit.callCount
                for callNo in [0.. callCount - 1]
                  messages.push configuration.emitter.emit.getCall(callNo).args[1].message
                assert.notInclude messages, "Failed in after hook:"
                done()

        describe 'in after hook when transaction passes ', () ->
          beforeEach () ->
            hooksStub.afterHooks =
              'Group Machine > Machine > Delete Message > Bogus example name' : [
                (transaction) ->
                  transaction.fail = "Message after pass"
              ]
            sinon.stub configuration.emitter, 'emit'

          afterEach () ->
            configuration.emitter.emit.reset()
            configuration.emitter.emit.restore()
            hooksStub.afterHooks = {}

          it 'should make the request', (done) ->
            runner.executeAllTransactions [transaction], hooksStub, () ->
              assert.ok server.isDone()
              done()

          it 'it should fail the test', (done) ->
            runner.executeAllTransactions [transaction], hooksStub, () ->
              assert.ok configuration.emitter.emit.calledWith "test fail"
              done()

          it 'it should not pass the test', (done) ->
            runner.executeAllTransactions [transaction], hooksStub, () ->
              assert.notOk configuration.emitter.emit.calledWith "test pass"
              done()

          it 'it should pass the failing message to the emitter', (done) ->
            runner.executeAllTransactions [transaction], hooksStub, () ->
              messages = []
              callCount = configuration.emitter.emit.callCount
              for callNo in [0.. callCount - 1]
                messages.push configuration.emitter.emit.getCall(callNo).args[1].message
              assert.include messages.join(), "Message after pass"
              done()

          it 'should mention after hook in the error message', (done) ->
            runner.executeAllTransactions [transaction], hooksStub, () ->
              messages = []
              callCount = configuration.emitter.emit.callCount
              for callNo in [0.. callCount - 1]
                messages.push configuration.emitter.emit.getCall(callNo).args[1].message
              assert.include messages.join(), "Failed in after hook:"
              done()

          it 'should set transaction test status to failed', (done) ->
            runner.executeAllTransactions [transaction], hooksStub, () ->
              assert.equal transaction.test.status, 'fail'
              done()

      describe 'without hooks', () ->
        beforeEach () ->
          hooksStub.beforeHooks = {}
          hooksStub.afterHooks = {}
          sinon.stub configuration.emitter, 'emit'

        afterEach () ->
          configuration.emitter.emit.reset()
          configuration.emitter.emit.restore()
          hooksStub.afterHooks = {}
          hooksStub.beforeHooks = {}

        it 'should not run the hooks', (done) ->
          runner.executeAllTransactions [transaction], hooksStub, () ->
            done()

        it 'should pass the transactions', (done) ->
          runner.executeAllTransactions [transaction], hooksStub, () ->
            assert.ok configuration.emitter.emit.calledWith "test pass"
            done()

      describe 'with hook modifying the transaction body and backend Express app using the body parser', () ->
        it 'should perform the transaction and don\'t hang', (done) ->
          nock.cleanAll()

          receivedRequests = []

          hooksStub.beforeHooks =
            'Group Machine > Machine > Delete Message > Bogus example name' : [
              (transaction) ->
                body = JSON.parse transaction.request.body
                body.name = "Michael"
                transaction.request.body = JSON.stringify body
                transaction.request.headers['Content-Length'] = transaction.request.body.length
            ]

          app = express()
          app.use(bodyParser.json())

          app.post '/machines', (req, res) ->
            receivedRequests.push req
            res.setHeader 'Content-Type', 'application/json'
            machine =
              type: 'bulldozer'
              name: 'willy'
            response = [machine]
            res.status(200).send response

          server = app.listen transaction.port, () ->
            runner.executeAllTransactions [transaction], hooksStub, () ->
              #should not hang here
              assert.ok true
              server.close()

          server.on 'close', () ->
            assert.equal receivedRequests.length, 1
            done()
