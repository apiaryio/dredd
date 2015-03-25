require 'coffee-errors'
{EventEmitter} = require 'events'
{assert} = require 'chai'
clone = require 'clone'
nock = require 'nock'
proxyquire = require 'proxyquire'
sinon = require 'sinon'
express = require 'express'
bodyParser = require 'body-parser'

htmlStub = require 'html'
loggerStub = require '../../src/logger'
addHooks = require '../../src/add-hooks'
httpStub = require 'http'
httpsStub = require 'https'

Runner = proxyquire  '../../src/transaction-runner', {
  'html': htmlStub,
  './logger': loggerStub
  'http': httpStub
  'https': httpsStub
}

CliReporter = require '../../src/reporters/cli-reporter'

describe 'TransactionRunner', ()->

  server = {}
  configuration =
    server: 'http://localhost:3000'
    emitter: new EventEmitter()
    options:
      'dry-run': false
      method: []
      only: []
      header: []
      reporter:  []
  transaction = {}
  runner = {}

  before () ->
    loggerStub.transports.console.silent = true

  after () ->
    loggerStub.transports.console.silent = false

  describe 'constructor', () ->

    beforeEach () ->
      runner = new Runner(configuration)

    it 'should copy configuration', () ->
      assert.ok runner.configuration.server

  describe 'config(config)', () ->
    describe 'when single file in data is present', () ->
      it 'should set multiBlueprint to false', () ->
        configuration =
          server: 'http://localhost:3000'
          emitter: new EventEmitter()
          data: {"file1": {"raw": "blueprint1"}}
          options:
            'dry-run': false
            method: []
            only: []
            header: []
            reporter: []

        runner = new Runner(configuration)
        runner.config(configuration)

        assert.notOk runner.multiBlueprint

    describe 'when multiple files in data are present', () ->
      it 'should set multiBlueprint to true', () ->
        configuration =
          server: 'http://localhost:3000'
          emitter: new EventEmitter()
          data: {"file1": {"raw": "blueprint1"}, "file2": {"raw": "blueprint2"} }
          options:
            'dry-run': false
            method: []
            only: []
            header: []
            reporter: []
        runner = new Runner(configuration)
        runner.config(configuration)

        assert.ok runner.multiBlueprint

  describe 'configureTransaction(transaction, callback)', () ->

    beforeEach () ->
      transaction =
        request:
          body: "{\n  \"type\": \"bulldozer\",\n  \"name\": \"willy\"}\n"
          headers:
            "Content-Type":
              value: "application/json"
          uri: "/machines",
          method: "POST"
        response:
          body: "{\n  \"type\": \"bulldozer\",\n  \"name\": \"willy\",\n  \"id\": \"5229c6e8e4b0bd7dbb07e29c\"\n}\n"
          headers:
            "content-type":
              value: "application/json"
          status: "202"
        origin:
          apiName: "Machines API"
          resourceGroupName: "Group Machine"
          resourceName: "Machine"
          actionName: "Delete Message"
          exampleName: "Bogus example name"

      runner = new Runner(configuration)

    describe 'when processing multiple blueprints', () ->
      it 'should include api name in the transaction name', (done) ->
        runner.multiBlueprint = true
        runner.configureTransaction transaction, (err, configuredTransaction) ->
          assert.include configuredTransaction.name, 'Machines API'
          done()

    describe 'when processing only single blueprint', () ->
      it 'should not include api name in the transaction name', (done) ->
        runner.multiBlueprint = false
        runner.configureTransaction transaction, (err, configuredTransaction) ->
          assert.notInclude configuredTransaction.name, 'Machines API'
          done()

    describe 'when request does not have User-Agent', () ->

      it 'should add the Dredd User-Agent', (done) ->
        runner.configureTransaction transaction, (err, configuredTransaction) ->
          assert.ok configuredTransaction.request.headers['User-Agent']
          done()

    describe 'when an additional header has a colon', ()->
      beforeEach () ->
        configuration.options.header = ["MyCustomDate:Wed, 10 Sep 2014 12:34:26 GMT"]
        runner = new Runner(configuration)

      afterEach () ->
        configuration.options.header = []

      it 'should include the entire value in the header', (done)->
        runner.configureTransaction transaction, (err, configuredTransaction) ->
          assert.equal configuredTransaction.request.headers['MyCustomDate'], 'Wed, 10 Sep 2014 12:34:26 GMT'
          done()

    describe 'when configuring a transaction', () ->

      it 'should callback with a properly configured transaction', (done) ->
        runner.configureTransaction transaction, (err, configuredTransaction) ->
          assert.equal configuredTransaction.name, 'Group Machine > Machine > Delete Message > Bogus example name'
          assert.equal configuredTransaction.id, 'POST /machines'
          assert.ok configuredTransaction.host
          assert.ok configuredTransaction.request
          assert.ok configuredTransaction.expected
          assert.strictEqual transaction.origin, configuredTransaction.origin
          done()

  describe 'executeTransaction(transaction, callback)', () ->

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
          status: '202'
        origin:
          resourceGroupName: 'Group Machine'
          resourceName: 'Machine'
          actionName: 'Delete Message'
          exampleName: 'Bogus example name'
        fullPath: '/machines'
        protocol: 'http:'

    describe 'when no Content-Length is present', () ->

      beforeEach () ->
        delete transaction.request.headers["Content-Length"]
        server = nock('http://localhost:3000').
          post('/machines', {"type":"bulldozer","name":"willy"}).
          reply transaction['expected']['status'],
            transaction['expected']['body'],
            {'Content-Type': 'application/json'}

      afterEach () ->
        nock.cleanAll()

      it 'should add a Content-Length header', (done) ->
        runner.executeTransaction transaction, () ->
          assert.ok transaction.request.headers['Content-Length']
          done()

    describe 'when Content-Length header is present', () ->

      beforeEach () ->
        transaction.request.headers["Content-Length"] = 44
        server = nock('http://localhost:3000').
          post('/machines', {"type":"bulldozer","name":"willy"}).
          reply transaction['expected']['status'],
            transaction['expected']['body'],
            {'Content-Type': 'application/json'}

      afterEach () ->
        nock.cleanAll()

      it 'should not add a Content-Length header', (done) ->
        runner.executeTransaction transaction, () ->
          assert.equal transaction.request.headers['Content-Length'], 44
          done()


    describe 'when printing the names', () ->

      beforeEach () ->
        sinon.spy loggerStub, 'info'
        configuration.options['names'] = true
        runner = new Runner(configuration)

      afterEach () ->
        loggerStub.info.restore()
        configuration.options['names'] = false

      it 'should print the names and return', (done) ->
        runner.executeTransaction transaction, () ->
          assert.ok loggerStub.info.called
          done()

    describe 'when a dry run', () ->

      beforeEach () ->
        configuration.options['dry-run'] = true
        runner = new Runner(configuration)
        sinon.stub httpStub, 'request'


      afterEach () ->
        configuration.options['dry-run'] = false
        httpStub.request.restore()

      it 'should skip the tests', (done) ->
        runner.executeTransaction transaction, () ->
          assert.ok httpStub.request.notCalled
          done()

    describe 'when only certain methods are allowed by the configuration', () ->

      beforeEach () ->
        configuration.options['method'] = ['GET']
        sinon.stub configuration.emitter, 'emit'
        runner = new Runner(configuration)

      afterEach () ->
        configuration.emitter.emit.restore()
        configuration.options['method'] = []

      it 'should only perform those requests', (done) ->
        runner.executeTransaction transaction, () ->
          assert.ok configuration.emitter.emit.calledWith 'test skip'
          done()

    describe 'when only certain names are allowed by the configuration', () ->

      beforeEach () ->
        server = nock('http://localhost:3000').
          post('/machines', {"type":"bulldozer","name":"willy"}).
          reply transaction['expected']['status'],
            transaction['expected']['body'],
            {'Content-Type': 'application/json'}

        configuration.options['only'] = ['Group Machine > Machine > Delete Message > Bogus example name']
        sinon.stub configuration.emitter, 'emit'
        runner = new Runner(configuration)

      afterEach () ->
        configuration.emitter.emit.restore()
        configuration.options['only'] = []
        nock.cleanAll()

      it 'should not skip transactions with matching names', (done) ->
        runner.executeTransaction transaction, () ->
          assert.notOk configuration.emitter.emit.calledWith 'test skip'
          done()

      it 'should skip transactions with different names', (done) ->
        transaction['name'] = 'Group Machine > Machine > Delete Message > Bogus different example name'
        runner.executeTransaction transaction, () ->
          assert.ok configuration.emitter.emit.calledWith 'test skip'
          done()

    describe 'when a test has been manually set to skip in a hook', () ->

      beforeEach () ->
        sinon.stub configuration.emitter, 'emit'
        runner = new Runner(configuration)

      afterEach () ->
        configuration.emitter.emit.restore()

      it 'should skip the test', (done) ->
        transaction.skip = true
        runner.executeTransaction transaction, () ->
          assert.ok configuration.emitter.emit.calledWith 'test skip'
          done()

    describe 'when server uses https', () ->

      beforeEach () ->
        server = nock('https://localhost:3000').
          post('/machines', {"type":"bulldozer","name":"willy"}).
          reply transaction['expected']['status'],
            transaction['expected']['body'],
            {'Content-Type': 'application/json'}
        configuration.server = 'https://localhost:3000'
        transaction.protocol = 'https:'
        runner = new Runner(configuration)

      afterEach () ->
        nock.cleanAll()

      it 'should make the request with https', (done) ->
        runner.executeTransaction transaction, () ->
          assert.ok server.isDone()
          done()

    describe 'when server uses http', () ->

      beforeEach () ->
        server = nock('http://localhost:3000').
          post('/machines', {"type":"bulldozer","name":"willy"}).
          reply transaction['expected']['status'],
            transaction['expected']['body'],
            {'Content-Type': 'application/json'}
        configuration.server = 'http://localhost:3000'
        transaction.protocol = 'http:'
        runner = new Runner(configuration)

      afterEach () ->
        nock.cleanAll()

      it 'should make the request with http', (done) ->
        runner.executeTransaction transaction, () ->
          assert.ok server.isDone()
          done()

    describe 'when backend responds as it should', () ->
      beforeEach () ->
        server = nock('http://localhost:3000').
          post('/machines', {"type":"bulldozer","name":"willy"}).
          reply transaction['expected']['status'],
            transaction['expected']['body'],
            {'Content-Type': 'application/json'}
        runner = new Runner(configuration)

      afterEach () ->
        nock.cleanAll()

      it 'should perform the request', (done) ->
        runner.executeTransaction transaction, () ->
          assert.ok server.isDone()
          done()

      it 'should not return an error', (done) ->
        runner.executeTransaction transaction, (error) ->
          assert.notOk error
          done()

    describe 'when backend responds with invalid response', () ->
      beforeEach () ->
        server = nock('http://localhost:3000').
          post('/machines', {"type":"bulldozer","name":"willy"}).
          reply 400,
            'Foo bar',
            {'Content-Type': 'text/plain'}
        runner = new Runner(configuration)

      afterEach () ->
        nock.cleanAll()

      it 'should perform the request', (done) ->
        runner.executeTransaction transaction, () ->
          assert.ok server.isDone()
          done()

  describe 'executeTransaction(transaction, callback) multipart', () ->
    multiPartTransaction = null
    notMultiPartTransaction = null
    runner = null
    beforeEach () ->
      runner = new Runner(configuration)
      multiPartTransaction =
          name: 'Group Machine > Machine > Post Message> Bogus example name'
          id: 'POST /machines/message'
          host: 'localhost'
          port: '3000'
          request:
            body: '\n--BOUNDARY \ncontent-disposition: form-data; name="mess12"\n\n{"message":"mess1"}\n--BOUNDARY\n\nContent-Disposition: form-data; name="mess2"\n\n{"message":"mess1"}\n--BOUNDARY--'
            headers:
              'Content-Type': 'multipart/form-data; boundary=BOUNDARY'
              'User-Agent': 'Dredd/0.2.1 (Darwin 13.0.0; x64)'
              'Content-Length': 180
            uri: '/machines/message'
            method: 'POST'
          expected:
            headers:
              'content-type': 'text/htm'
          body: ''
          status: '204'
          origin:
            resourceGroupName: 'Group Machine'
            resourceName: 'Machine'
            actionName: 'Post Message'
            exampleName: 'Bogus example name'
          fullPath: '/machines/message'
          protocol: 'http:'

      notMultiPartTransaction =
          name: 'Group Machine > Machine > Post Message> Bogus example name'
          id: 'POST /machines/message'
          host: 'localhost'
          port: '3000'
          request:
            body: '\n--BOUNDARY \ncontent-disposition: form-data; name="mess12"\n\n{"message":"mess1"}\n--BOUNDARY\n\nContent-Disposition: form-data; name="mess2"\n\n{"message":"mess1"}\n--BOUNDARY--'
            headers:
              'Content-Type': 'text/plain'
              'User-Agent': 'Dredd/0.2.1 (Darwin 13.0.0; x64)'
              'Content-Length': 180
            uri: '/machines/message'
            method: 'POST'
          expected:
            headers:
              'content-type': 'text/htm'
          body: ''
          status: '204'
          origin:
            resourceGroupName: 'Group Machine'
            resourceName: 'Machine'
            actionName: 'Post Message'
            exampleName: 'Bogus example name'
          fullPath: '/machines/message'
          protocol: 'http:'

    describe 'when multipart header in request', () ->

      parsedBody = '\r\n--BOUNDARY \r\ncontent-disposition: form-data; name="mess12"\r\n\r\n{"message":"mess1"}\r\n--BOUNDARY\r\n\r\nContent-Disposition: form-data; name="mess2"\r\n\r\n{"message":"mess1"}\r\n--BOUNDARY--'
      beforeEach () ->
        server = nock('http://localhost:3000').
        post('/machines/message').
        reply 204
        configuration.server = 'http://localhost:3000'

      afterEach () ->
        nock.cleanAll()

      it 'should replace line feed in body', (done) ->
        runner.executeTransaction multiPartTransaction, () ->
          assert.ok server.isDone()
          assert.equal multiPartTransaction['request']['body'], parsedBody, 'Body'
          assert.include multiPartTransaction['request']['body'], "\r\n"
          done()

    describe 'when multipart header in request is with lowercase key', () ->

      parsedBody = '\r\n--BOUNDARY \r\ncontent-disposition: form-data; name="mess12"\r\n\r\n{"message":"mess1"}\r\n--BOUNDARY\r\n\r\nContent-Disposition: form-data; name="mess2"\r\n\r\n{"message":"mess1"}\r\n--BOUNDARY--'
      beforeEach () ->
        server = nock('http://localhost:3000').
        post('/machines/message').
        reply 204
        configuration.server = 'http://localhost:3000'

        delete multiPartTransaction['request']['headers']['Content-Type']
        multiPartTransaction['request']['headers']['content-type'] = 'multipart/form-data; boundary=BOUNDARY'

      afterEach () ->
        nock.cleanAll()

      it 'should replace line feed in body', (done) ->
        runner.executeTransaction multiPartTransaction, () ->
          assert.ok server.isDone()
          assert.equal multiPartTransaction['request']['body'], parsedBody, 'Body'
          assert.include multiPartTransaction['request']['body'], "\r\n"
          done()

    describe 'when multipart header in request, but body already has some CR (added in hooks e.g.s)', () ->
      beforeEach () ->
        server = nock('http://localhost:3000').
        post('/machines/message').
        reply 204
        configuration.server = 'http://localhost:3000'
        multiPartTransaction['request']['body'] = '\r\n--BOUNDARY \r\ncontent-disposition: form-data; name="mess12"\r\n\r\n{"message":"mess1"}\r\n--BOUNDARY\r\n\r\nContent-Disposition: form-data; name="mess2"\r\n\r\n{"message":"mess1"}\r\n--BOUNDARY--'

      afterEach () ->
        nock.cleanAll()

      it 'should not add CR again', (done) ->
        runner.executeTransaction multiPartTransaction, () ->
          assert.ok server.isDone()
          assert.notInclude multiPartTransaction['request']['body'], "\r\r"
          done()

    describe 'when multipart header is not in request', () ->
      beforeEach () ->
        server = nock('http://localhost:3000').
        post('/machines/message').
        reply 204
        configuration.server = 'http://localhost:3000'

      afterEach () ->
        nock.cleanAll()

      it 'should not include any line-feed in body', (done) ->
        runner.executeTransaction notMultiPartTransaction, () ->
          assert.ok server.isDone()
          assert.notInclude multiPartTransaction['request']['body'], "\r\n"
          done()

  describe '#executeAllTransactions', () ->

    configuration =
      server: 'http://localhost:3000'
      emitter: new EventEmitter()
      options:
        'dry-run': false
        method: []
        header: []
        reporter:  []
        only: []
        # do not actually search & load hookfiles from disk
        # hookfiles: './**/*_hooks.*'

    transaction = {}
    transactions = {}

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
      transactions = {}
      transactions[transaction.name] = clone transaction, false
      runner = new Runner(configuration)
      addHooks runner, transactions

    afterEach () ->
      nock.cleanAll()

    describe 'with hooks', () ->
      beforeEach () ->
        sinon.spy loggerStub, 'info'
        runner.hooks.beforeHooks =
          'Group Machine > Machine > Delete Message > Bogus example name': [
            (transaction) ->
              loggerStub.info "before"
          ]
        runner.hooks.afterHooks =
          'Group Machine > Machine > Delete Message > Bogus example name': [
            (transaction, done) ->
              loggerStub.info "after"
              done()
          ]

      afterEach () ->
        loggerStub.info.restore()

      it 'should run the hooks', (done) ->
        runner.executeAllTransactions [transaction], runner.hooks, () ->
          assert.ok loggerStub.info.calledWith "before"
          assert.ok loggerStub.info.calledWith "after"
          done()

    describe 'with hooks, but without hooks.transactions set', () ->
      beforeEach () ->
        sinon.spy loggerStub, 'info'
        runner.hooks.transactions = null
        runner.hooks.beforeHooks =
          'Group Machine > Machine > Delete Message > Bogus example name' : [
            (transaction) ->
              loggerStub.info "before"
          ]
        runner.hooks.afterHooks =
          'Group Machine > Machine > Delete Message > Bogus example name' : [
            (transaction, done) ->
              loggerStub.info "after"
              done()
          ]

      afterEach () ->
        loggerStub.info.restore()

      it 'should run the hooks', (done) ->
        runner.hooks.transactions = null
        runner.executeAllTransactions [transaction], runner.hooks, () ->
          assert.ok loggerStub.info.calledWith "before"
          assert.ok loggerStub.info.calledWith "after"
          done()

    describe 'with multiple hooks for the same transaction', () ->
      beforeEach () ->
        sinon.spy loggerStub, 'info'
        runner.hooks.beforeHooks =
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
        runner.executeAllTransactions [transaction], runner.hooks, () ->
          assert.ok loggerStub.info.calledWith "first"
          assert.ok loggerStub.info.calledWith "second"
          done()

    describe 'with a beforeAll hook', () ->
      beforeAll = sinon.stub()
      beforeAll.callsArg(0)

      beforeEach () ->
        runner.hooks.beforeAll beforeAll

      it 'should run the hooks', (done) ->
        runner.executeAllTransactions [], runner.hooks, () ->
          assert.ok beforeAll.called
          done()

    describe 'with an afterAll hook', () ->
      afterAll = sinon.stub()
      afterAll.callsArg(0)

      beforeEach () ->
        runner.hooks.afterAll afterAll

      it 'should run the hooks', (done) ->
        runner.executeAllTransactions [], runner.hooks, () ->
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
        runner.hooks.beforeAll beforeAll1
        runner.hooks.afterAll afterAll1
        runner.hooks.afterAll afterAll2
        runner.hooks.beforeAll beforeAll2

      it 'should run all the events in order', (done) ->
        runner.executeAllTransactions [], runner.hooks, () ->
          assert.ok beforeAll1.calledBefore(beforeAll2)
          assert.ok beforeAll2.called
          assert.ok afterAll1.calledBefore(afterAll2)
          assert.ok afterAll2.called
          done()

    describe 'with before hook that throws an error', () ->
      beforeEach () ->
        runner.hooks.beforeHooks =
          'Group Machine > Machine > Delete Message > Bogus example name' : [
            (transaction) ->
              JSON.parse '<<<>>>!@#!@#!@#4234234'
          ]
        sinon.stub configuration.emitter, 'emit'

      afterEach () ->
        configuration.emitter.emit.restore()

      it 'should report an error with the test', (done) ->
        runner.executeAllTransactions [transaction], runner.hooks, () ->
          assert.ok configuration.emitter.emit.calledWith "test error"
          done()

    describe 'with after hook that throws an error', () ->
      beforeEach () ->
        runner.hooks.afterHooks =
          'Group Machine > Machine > Delete Message > Bogus example name' : [
            (transaction) ->
              JSON.parse '<<<>>>!@#!@#!@#4234234'
          ]
        sinon.stub configuration.emitter, 'emit'

      afterEach () ->
        configuration.emitter.emit.restore()

      it 'should report an error with the test', (done) ->
        runner.executeAllTransactions [transaction], runner.hooks, () ->
          assert.ok configuration.emitter.emit.calledWith "test error"
          done()

    describe 'with before hook that throws a chai expectation error', () ->
      beforeEach () ->
        runner.hooks.beforeHooks =
          'Group Machine > Machine > Delete Message > Bogus example name' : [
            (transaction) ->
              assert.ok false
          ]
        sinon.stub configuration.emitter, 'emit'

      afterEach () ->
        configuration.emitter.emit.restore()

      it 'should not report an error', (done) ->
        runner.executeAllTransactions [transaction], runner.hooks, () ->
          assert.notOk configuration.emitter.emit.calledWith "test error"
          done()

      it 'should report a fail', (done) ->
        runner.executeAllTransactions [transaction], runner.hooks, () ->
          assert.ok configuration.emitter.emit.calledWith "test fail"
          done()

    describe 'with after hook that throws a chai expectation error', () ->
      beforeEach () ->
        runner.hooks.afterHooks =
          'Group Machine > Machine > Delete Message > Bogus example name' : [
            (transaction) ->
              assert.ok false
          ]
        sinon.stub configuration.emitter, 'emit'

      afterEach () ->
        configuration.emitter.emit.restore()

      it 'should not report an error', (done) ->
        runner.executeAllTransactions [transaction], runner.hooks, () ->
          assert.notOk configuration.emitter.emit.calledWith "test error"
          done()

      it 'should report a fail', (done) ->
        runner.executeAllTransactions [transaction], runner.hooks, () ->
          assert.ok configuration.emitter.emit.calledWith "test fail"
          done()

      it 'should set test as failed', (done) ->
        runner.executeAllTransactions [transaction], runner.hooks, () ->
          assert.equal transaction.test.status, 'fail'
          done()


    describe 'with hook failing the transaction', () ->
      describe 'in before hook', () ->
        beforeEach () ->
          runner.hooks.beforeHooks =
            'Group Machine > Machine > Delete Message > Bogus example name' : [
              (transaction) ->
                transaction.fail = "Message before"
            ]
          sinon.stub configuration.emitter, 'emit'

        afterEach () ->
          configuration.emitter.emit.restore()

        it 'should fail the test', (done) ->
          runner.executeAllTransactions [transaction], runner.hooks, () ->
            assert.ok configuration.emitter.emit.calledWith "test fail"
            done()

        it 'should not run the transaction', (done) ->
          runner.executeAllTransactions [transaction], runner.hooks, () ->
            assert.notOk server.isDone()
            done()

        it 'should pass the failing message to the emitter', (done) ->
          runner.executeAllTransactions [transaction], runner.hooks, () ->
            messages = []
            callCount = configuration.emitter.emit.callCount
            for callNo in [0.. callCount - 1]
              messages.push configuration.emitter.emit.getCall(callNo).args[1].message
            assert.include messages.join(), "Message before"
            done()

        it 'should mention before hook in the error message', (done) ->
          runner.executeAllTransactions [transaction], runner.hooks, () ->
            messages = []
            callCount = configuration.emitter.emit.callCount
            for callNo in [0.. callCount - 1]
              messages.push configuration.emitter.emit.getCall(callNo).args[1].message
            assert.include messages.join(), "Failed in before hook:"
            done()

        describe 'when message is set to fail also in after hook', () ->
          beforeEach () ->
            runner.hooks.afterHooks =
              'Group Machine > Machine > Delete Message > Bogus example name' : [
                (transaction) ->
                  transaction.fail = "Message after"
              ]

          it 'should pass the failing message to the emitter', (done) ->
            runner.executeAllTransactions [transaction], runner.hooks, () ->
              messages = []
              callCount = configuration.emitter.emit.callCount
              for callNo in [0.. callCount - 1]
                messages.push configuration.emitter.emit.getCall(callNo).args[1].message
              assert.notInclude messages, "Message after fail"
              done()

          it 'should not mention after hook in the error message', (done) ->
            runner.executeAllTransactions [transaction], runner.hooks, () ->
              messages = []
              callCount = configuration.emitter.emit.callCount
              for callNo in [0.. callCount - 1]
                messages.push configuration.emitter.emit.getCall(callNo).args[1].message
              assert.notInclude messages, "Failed in after hook:"
              done()

      describe 'in after hook when transaction fails ', () ->
        modifiedTransaction = {}
        beforeEach () ->
          modifiedTransaction = clone(transaction)
          modifiedTransaction['expected']['statusCode'] = "303"

          runner.hooks.afterHooks =
            'Group Machine > Machine > Delete Message > Bogus example name' : [
              (transaction) ->
                transaction.fail = "Message after fail"
            ]
          sinon.stub configuration.emitter, 'emit'

        afterEach () ->
          configuration.emitter.emit.reset()
          configuration.emitter.emit.restore()

        it 'should make the request', (done) ->
          runner.executeAllTransactions [transaction], runner.hooks, () ->
            assert.ok server.isDone()
            done()

        it 'should not fail again', (done) ->
          runner.executeAllTransactions [modifiedTransaction], runner.hooks, () ->
            failCount = 0
            messages = []
            callCount = configuration.emitter.emit.callCount
            for callNo in [0.. callCount - 1]
              failCount++ if configuration.emitter.emit.getCall(callNo).args[0] == 'test fail'
              messages.push configuration.emitter.emit.getCall(callNo).args[1].message
            assert.equal failCount, 1
            done()

        it 'should not pass the hook message to the emitter', (done) ->
          runner.executeAllTransactions [modifiedTransaction], runner.hooks, () ->
            messages = []
            callCount = configuration.emitter.emit.callCount
            for callNo in [0.. callCount - 1]
              messages.push configuration.emitter.emit.getCall(callNo).args[1].message
            assert.notInclude messages, "Message after fail"
            done()

        it 'should not mention after hook in the error message', (done) ->
          runner.executeAllTransactions [transaction], runner.hooks, () ->
            messages = []
            callCount = configuration.emitter.emit.callCount
            for callNo in [0.. callCount - 1]
              messages.push configuration.emitter.emit.getCall(callNo).args[1].message
            assert.notInclude messages, "Failed in after hook:"
            done()

      describe 'in after hook when transaction passes ', () ->
        beforeEach () ->
          runner.hooks.afterHooks =
            'Group Machine > Machine > Delete Message > Bogus example name' : [
              (transaction) ->
                transaction.fail = "Message after pass"
            ]
          sinon.stub configuration.emitter, 'emit'

        afterEach () ->
          configuration.emitter.emit.reset()
          configuration.emitter.emit.restore()

        it 'should make the request', (done) ->
          runner.executeAllTransactions [transaction], runner.hooks, () ->
            assert.ok server.isDone()
            done()

        it 'it should fail the test', (done) ->
          runner.executeAllTransactions [transaction], runner.hooks, () ->
            assert.ok configuration.emitter.emit.calledWith "test fail"
            done()

        it 'it should not pass the test', (done) ->
          runner.executeAllTransactions [transaction], runner.hooks, () ->
            assert.notOk configuration.emitter.emit.calledWith "test pass"
            done()

        it 'it should pass the failing message to the emitter', (done) ->
          runner.executeAllTransactions [transaction], runner.hooks, () ->
            messages = []
            callCount = configuration.emitter.emit.callCount
            for callNo in [0.. callCount - 1]
              messages.push configuration.emitter.emit.getCall(callNo).args[1].message
            assert.include messages.join(), "Message after pass"
            done()

        it 'should mention after hook in the error message', (done) ->
          runner.executeAllTransactions [transaction], runner.hooks, () ->
            messages = []
            callCount = configuration.emitter.emit.callCount
            for callNo in [0.. callCount - 1]
              messages.push configuration.emitter.emit.getCall(callNo).args[1].message
            assert.include messages.join(), "Failed in after hook:"
            done()

        it 'should set transaction test status to failed', (done) ->
          runner.executeAllTransactions [transaction], runner.hooks, () ->
            assert.equal transaction.test.status, 'fail'
            done()

    describe 'without hooks', () ->
      beforeEach () ->
        sinon.stub configuration.emitter, 'emit'

      afterEach () ->
        configuration.emitter.emit.reset()
        configuration.emitter.emit.restore()

      it 'should not run the hooks', (done) ->
        runner.executeAllTransactions [transaction], runner.hooks, () ->
          done()

      it 'should pass the transactions', (done) ->
        runner.executeAllTransactions [transaction], runner.hooks, () ->
          assert.ok configuration.emitter.emit.calledWith "test pass"
          done()

    describe 'with hook modifying the transaction body and backend Express app using the body parser', () ->
      it 'should perform the transaction and don\'t hang', (done) ->
        nock.cleanAll()

        receivedRequests = []

        runner.hooks.beforeHooks =
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
          runner.executeAllTransactions [transaction], runner.hooks, () ->
            #should not hang here
            assert.ok true
            server.close()

        server.on 'close', () ->
          assert.equal receivedRequests.length, 1
          done()

  describe 'runHoook(hook, tranasction, callback)', () ->
    describe 'when sandbox mode is on', () ->
      it 'shuold run the hook'
      it 'should not have aceess to current context'
      it 'should not have access to require'
      it 'should set back the transaction'
      it 'should have access to the hook stash'
      it 'should be able to modify hook stash'

