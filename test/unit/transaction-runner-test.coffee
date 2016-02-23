require 'coffee-errors'
{EventEmitter} = require 'events'
{assert} = require 'chai'
clone = require 'clone'
nock = require 'nock'
nock.enableNetConnect()

proxyquire = require 'proxyquire'
sinon = require 'sinon'
express = require 'express'
bodyParser = require 'body-parser'
clone = require 'clone'

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
Hooks = require '../../src/hooks'

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
    nock.disableNetConnect()

  after () ->
    loggerStub.transports.console.silent = false
    nock.enableNetConnect()

  describe 'constructor', () ->

    beforeEach () ->
      runner = new Runner(configuration)

    it 'should copy configuration', () ->
      assert.ok runner.configuration.server

    it 'should have an empty hookStash object', () ->
      assert.deepEqual runner.hookStash, {}

    it 'should have an empty array of logs object', () ->
      assert.deepEqual runner.logs, []

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
        name: "Machines API > Group Machine > Machine > Delete Message > Bogus example name"
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
        conf = clone configuration
        conf.options.header = ["MyCustomDate:Wed, 10 Sep 2014 12:34:26 GMT"]
        runner = new Runner(conf)

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

    describe 'when endpoint URL contains PORT and path', ->
      beforeEach ->
        configurationWithPath = clone configuration
        configurationWithPath.server = 'https://hostname.tld:9876/my/path/to/api/'
        runner = new Runner configurationWithPath

      it 'should join the endpoint path with transaction uriTemplate together', (done) ->
        runner.configureTransaction transaction, (err, configuredTransaction) ->
          assert.equal configuredTransaction.id, 'POST /machines'
          assert.strictEqual configuredTransaction.host, 'hostname.tld'
          assert.equal configuredTransaction.port, 9876
          assert.strictEqual configuredTransaction.protocol, 'https:'
          assert.strictEqual configuredTransaction.fullPath, '/my/path/to/api' + '/machines'
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
      clonedTransaction = null

      beforeEach (done) ->
        sinon.stub configuration.emitter, 'emit'

        clonedTransaction = clone(transaction)

        runner = new Runner(configuration)

        addHooks runner, [clonedTransaction], (err) ->
          done err if err

          runner.hooks.beforeHooks =
            'Group Machine > Machine > Delete Message > Bogus example name' : [
              (hookTransaction) ->
                hookTransaction.skip = true
            ]
          done()

      afterEach () ->
        configuration.emitter.emit.restore()

      it 'should skip the test', (done) ->
        runner.executeAllTransactions [clonedTransaction], runner.hooks, () ->
          assert.ok configuration.emitter.emit.calledWith 'test skip'
          done()

      it 'should add skip message as a warning under `general` to the results on transaction', (done) ->
        runner.executeAllTransactions [clonedTransaction], runner.hooks, () ->
          messages = clonedTransaction['results']['general']['results'].map (value, index) -> value['message']
          assert.include messages.join(), 'skipped'
          done()

      it 'should add fail message as a warning under `general` to the results on test passed to the emitter', (done) ->
          runner.executeAllTransactions [clonedTransaction], runner.hooks, () ->
            messages = []
            callCount = configuration.emitter.emit.callCount
            for callNo in [0.. callCount - 1]
              messages.push configuration.emitter.emit.getCall(callNo).args[1]['results']['general']['results'].map(
                (value, index) -> value['message']
              )
            assert.include messages.join(), 'skipped'
            done()

      it 'should set status `skip` on test passed to the emitter', (done) ->
          runner.executeAllTransactions [clonedTransaction], runner.hooks, () ->
            tests = []
            callCount = Object.keys(configuration.emitter.emit.args).map (value, index) ->
              args = configuration.emitter.emit.args[value]
              tests.push args[1] if args[0] == 'test skip'

            assert.equal tests.length, 1

            assert.equal tests[0]['status'], 'skip'
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


    describe 'when server is not running', () ->
      beforeEach () ->
        sinon.spy configuration.emitter, 'emit'
        runner = new Runner(configuration)

      afterEach () ->
        configuration.emitter.emit.restore()

      it 'should report a error', (done) ->
        runner.executeTransaction transaction, () ->
          assert.ok configuration.emitter.emit.called
          events = Object.keys(configuration.emitter.emit.args).map (value, index) ->
            configuration.emitter.emit.args[value][0]
          assert.include events, 'test error'
          done()

  describe 'exceuteAllTransactions(transactions, hooks, callback)', ->
    runner = null
    hooks = null
    transactions = []
    serverNock1 = null
    serverNock2 = null
    returnedError = null
    spies = {}

    beforeEach () ->
      returnedError = null
      transactions = []

      for name in ['1', '2']
        transaction = clone {
          name: name
          id: 'POST /machines' + name
          host: 'localhost'
          port: '3000'
          request:
            body: '{\n  "type": "bulldozer",\n  "name": "willy"}\n'
            headers:
              'Content-Type': 'application/json'
              'User-Agent': 'Dredd/0.2.1 (Darwin 13.0.0; x64)'
              'Content-Length': 44
            uri: '/machines' + name
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
          fullPath: '/machines' + name
        }

        transactions.push transaction

      runner = new Runner(configuration)
      hooks = new Hooks(logs: [], logger: console)

      spyNames = [
        'beforeAllSpy'
        'beforeEachSpy'
        'beforeEachValidationSpy'
        'beforeSpy'
        'beforeValidationSpy'
        'afterSpy'
        'afterEachSpy'
        'afterAllSpy'
      ]

      spies = {}
      for name in spyNames
        spies[name] = (data, hooksCallback) -> hooksCallback()
        sinon.stub spies, name, (data, hooksCallback) -> hooksCallback()

      hooks.beforeAll spies.beforeAllSpy
      hooks.beforeEach spies.beforeEachSpy
      hooks.beforeEachValidation spies.beforeEachValidationSpy
      hooks.before '1', spies.beforeSpy
      hooks.before '2', spies.beforeSpy
      hooks.beforeValidation '1', spies.beforeValidationSpy
      hooks.beforeValidation '2', spies.beforeValidationSpy
      hooks.after '1', spies.afterSpy
      hooks.after '2', spies.afterSpy
      hooks.afterEach spies.afterEachSpy
      hooks.afterAll spies.afterAllSpy

      runner.hooks = hooks

      serverNock1 = nock('http://localhost:3000').
        post('/machines1', {"type":"bulldozer","name":"willy"}).
        reply transaction['expected']['statusCode'],
          transaction['expected']['body'],
          {'Content-Type': 'application/json'}

      serverNock2 = nock('http://localhost:3000').
        post('/machines2', {"type":"bulldozer","name":"willy"}).
        reply transaction['expected']['statusCode'],
          transaction['expected']['body'],
          {'Content-Type': 'application/json'}

    afterEach () ->
      nock.cleanAll()

      for name, spy of spies then do (name, spy) ->
        spies[name].restore()

      runner = null
      hooks = null
      transactions = []
      serverNock1 = null
      serverNock2 = null
      returnedError = null
      spies = {}

    describe 'when the hooks handler is used', () ->
      describe "and it doesn't crash", () ->

        it 'should perform all transactions', (done) ->
          runner.executeAllTransactions transactions, hooks, (error) ->
            return done error if error
            assert.isTrue serverNock1.isDone(), 'first resource'
            assert.isTrue serverNock2.isDone(), 'second resource'
            done()

        it 'should execute all ‘all’ hooks once', (done) ->

          runner.executeAllTransactions transactions, hooks, (error) ->
            return done error if error
            for spyName, spy of spies
              break if spyName != 'beforeAllSpy'
              break if spyName != 'afterAllSpy'
              assert.isTrue spies[spyName].called, spyName
            done()

        it 'should execute all other hooks once', (done) ->

          runner.executeAllTransactions transactions, hooks, (error) ->
            return done error if error
            for spyName, spy of spies
              break if spyName != 'beforeAllSpy'
              break if spyName != 'afterAllSpy'
              assert.isTrue spies[spyName].calledTwice, spyName
            done()

      describe 'and it crashes (hook handler error was set)', () ->
        describe 'before any hook is executed', () ->
          beforeEach (done) ->
            runner.hookHandlerError = new Error 'handler died in before everything'
            runner.executeAllTransactions transactions, hooks, (error) ->
              #setting expectation for this error below in each describe block
              returnedError = error
              done()

          it 'should not perform any transaction', () ->
            assert.isFalse serverNock1.isDone(), 'first resource'
            assert.isFalse serverNock2.isDone(), 'second resource'

          it 'should not perform any hooks', () ->
            for own spyName, spy of spies
              assert.isFalse spies[spyName].called, spyName

          it 'should return the error', () ->
            assert.include returnedError.message, 'everything'

        describe 'after ‘beforeAll’ hook is executed', () ->
          beforeEach (done) ->
            hookHandlerError = new Error 'handler died in beforeAll'

            hooks.beforeAll (data, callback) ->
              runner.hookHandlerError = hookHandlerError
              callback()

            runner.executeAllTransactions transactions, hooks, (error) ->
              #setting expectation for this error below in each describe block
              returnedError = error
              done()

          it 'should perform the ‘beforeAll’ hook', () ->
            assert.isTrue spies.beforeAllSpy.called

          it 'should not perform any other hook', () ->
            for own spyName, spy of spies
              break if spyName == 'beforeAllSpy'
              assert.isFalse spies[spyName].called, spyName

          it 'should not perform any transaction', () ->
            assert.isFalse serverNock1.isDone(), 'first resource'
            assert.isFalse serverNock2.isDone(), 'second resource'

          it 'should return the error', () ->
            assert.include returnedError.message, 'beforeAll'

        describe 'after ‘beforeEach’ hook is executed', () ->
          beforeEach (done) ->
            hookHandlerError = new Error 'handler died in beforeEach'

            hooks.beforeEach (data, callback) ->
              runner.hookHandlerError = hookHandlerError
              callback()

            runner.executeAllTransactions transactions, hooks, (error) ->
              #setting expectation for this error below in each describe block
              returnedError = error
              done()

          it 'should perform the ‘beforeAll’ hook', () ->
            assert.isTrue spies.beforeAllSpy.called

          it 'should perform the ‘beforeEach’ hook', () ->
            assert.isTrue spies.beforeEachSpy.calledOnce

          it 'should not perform any other hook', () ->
            for own spyName, spy of spies
              break if spyName == 'beforeAllSpy'
              break if spyName == 'beforeEachSpy'
              assert.isFalse spies[spyName].called, spyName

          it 'should not perform any transaction', () ->
            assert.isFalse serverNock1.isDone(), 'first resource'
            assert.isFalse serverNock2.isDone(), 'second resource'

          it 'should return the error', () ->
            assert.include returnedError.message, 'beforeEach'

        describe 'after ‘before’ hook is executed', () ->
          beforeEach (done) ->
            hookHandlerError = new Error 'handler died in before 1'

            hooks.before '1', (data, callback) ->
              runner.hookHandlerError = hookHandlerError
              callback()

            runner.executeAllTransactions transactions, hooks, (error) ->
              #setting expectation for this error below in each describe block
              returnedError = error
              done()

          it 'should perform the ‘beforeAll’ hook', () ->
            assert.isTrue spies.beforeAllSpy.called

          it 'should perform the ‘beforeEach’ hook', () ->
            assert.isTrue spies.beforeEachSpy.calledOnce

          it 'should perform the ‘before’ hook', () ->
            assert.isTrue spies.beforeSpy.calledOnce

          it 'should not perform any other hook', () ->
            for own spyName, spy of spies
              break if spyName == 'beforeAllSpy'
              break if spyName == 'beforeEachSpy'
              break if spyName == 'beforeSpy'
              assert.isFalse spies[spyName].called, spyName

          it 'should not perform any transaction', () ->
            assert.isFalse serverNock1.isDone(), 'first resource'
            assert.isFalse serverNock2.isDone(), 'second resource'

          it 'should return the error', () ->
            assert.include returnedError.message, 'before 1'

        describe 'after ‘beforeEachValidation’ hook is executed', () ->
          beforeEach (done) ->
            hookHandlerError = new Error 'handler died in before each validation'

            hooks.beforeEachValidation (data, callback) ->
              runner.hookHandlerError = hookHandlerError
              callback()

            runner.executeAllTransactions transactions, hooks, (error) ->
              #setting expectation for this error below in each describe block
              returnedError = error
              done()

          it 'should perform the ‘beforeAll’ hook', () ->
            assert.equal spies.beforeAllSpy.callCount, 1

          it 'should perform the ‘beforeEach’ hook', () ->
            assert.equal spies.beforeEachSpy.callCount, 1

          it 'should perform the ‘before’ hook', () ->
            assert.equal spies.beforeSpy.callCount, 1

          it 'should perform the ‘beforeEachValidation’ hook', () ->
            assert.equal spies.beforeEachValidationSpy.callCount, 1

          it 'should not perform any other hook', () ->
            for own spyName, spy of spies
              break if spyName == 'beforeAllSpy'
              break if spyName == 'beforeEachSpy'
              break if spyName == 'beforeSpy'
              break if spyName == 'beforeEachValidationSpy'

              assert.isFalse spies[spyName].called, spyName

          it 'should perform only the first transaction', () ->
            assert.isTrue serverNock1.isDone(), 'first resource'
            assert.isFalse serverNock2.isDone(), 'second resource'

          it 'should return the error', () ->
            assert.include returnedError.message, 'before each validation'

        describe 'after ‘beforeValidation’ hook is executed', () ->
          beforeEach (done) ->
            hookHandlerError = new Error 'handler died in before validation 1'

            hooks.beforeValidation '1', (data, callback) ->
              runner.hookHandlerError = hookHandlerError
              callback()

            runner.executeAllTransactions transactions, hooks, (error) ->
              #setting expectation for this error below in each describe block
              returnedError = error
              done()

          it 'should perform the ‘beforeAll’ hook', () ->
            assert.isTrue spies.beforeAllSpy.called

          it 'should perform the ‘beforeEach’ hook', () ->
            assert.isTrue spies.beforeEachSpy.calledOnce

          it 'should perform the ‘before’ hook', () ->
            assert.isTrue spies.beforeSpy.calledOnce

          it 'should perform the ‘beforeEachValidation’ hook', () ->
            assert.isTrue spies.beforeEachValidationSpy.calledOnce

          it 'should perform the ‘beforeValidation’ hook', () ->
            assert.isTrue spies.beforeValidationSpy.calledOnce

          it 'should not perform any other hook', () ->
            for own spyName, spy of spies
              break if spyName == 'beforeAllSpy'
              break if spyName == 'beforeEachSpy'
              break if spyName == 'beforeSpy'
              break if spyName == 'beforeEachValidationSpy'
              break if spyName == 'beforeValidationSpy'

              assert.isFalse spies[spyName].called, spyName

          it 'should perform only first transaction', () ->
            assert.isTrue serverNock1.isDone(), 'first resource'
            assert.isFalse serverNock2.isDone(), 'second resource'

          it 'should return the error', () ->
            assert.include returnedError.message, 'before validation 1'

        describe 'after ‘after’ hook is executed', () ->
          beforeEach (done) ->
            hookHandlerError = new Error 'handler died in after 1'

            hooks.after '1', (data, callback) ->
              runner.hookHandlerError = hookHandlerError
              callback()

            runner.executeAllTransactions transactions, hooks, (error) ->
              #setting expectation for this error below in each describe block
              returnedError = error
              done()

          it 'should perform the ‘beforeAll’ hook', () ->
            assert.isTrue spies.beforeAllSpy.called

          it 'should perform the ‘beforeEach’ hook', () ->
            assert.isTrue spies.beforeEachSpy.calledOnce

          it 'should perform the ‘before’ hook', () ->
            assert.isTrue spies.beforeSpy.calledOnce

          it 'should perform the ‘beforeEachValidation’ hook', () ->
            assert.isTrue spies.beforeEachValidationSpy.calledOnce

          it 'should perform the ‘beforeValidation’ hook', () ->
            assert.isTrue spies.beforeValidationSpy.calledOnce

          it 'should perform the ‘afterEach’ hook', () ->
            assert.isTrue spies.afterEachSpy.calledOnce

          it 'should perform the ‘after’ hook', () ->
            assert.isTrue spies.afterSpy.calledOnce

          it 'should not perform any other hook', () ->
            for own spyName, spy of spies
              break if spyName == 'beforeAllSpy'
              break if spyName == 'beforeEachSpy'
              break if spyName == 'beforeSpy'
              break if spyName == 'beforeEachValidationSpy'
              break if spyName == 'beforeValidationSpy'
              break if spyName == 'after'
              assert.isFalse spies[spyName].called, spyName

          it 'should not perform any other transaction', () ->
            assert.isTrue serverNock1.isDone(), 'first resource'
            assert.isFalse serverNock2.isDone(), 'second resource'

          it 'should return the error', () ->
            assert.include returnedError.message, 'after 1'

        describe 'after ‘afterEach’ hook is executed', () ->
          beforeEach (done) ->
            hookHandlerError = new Error 'handler died in after each'

            hooks.afterEach (data, callback) ->
              runner.hookHandlerError = hookHandlerError
              callback()

            runner.executeAllTransactions transactions, hooks, (error) ->
              #setting expectation for this error below in each describe block
              returnedError = error
              done()

          it 'should perform the ‘beforeAll’ hook', () ->
            assert.isTrue spies.beforeAllSpy.called

          it 'should perform the ‘beforeEach’ hook', () ->
            assert.isTrue spies.beforeEachSpy.calledOnce

          it 'should perform the ‘before’ hook', () ->
            assert.isTrue spies.beforeSpy.calledOnce

          it 'should perform the ‘beforeEachValidation’ hook', () ->
            assert.isTrue spies.beforeEachValidationSpy.calledOnce

          it 'should perform the ‘beforeValidation’ hook', () ->
            assert.isTrue spies.beforeValidationSpy.calledOnce

          it 'should perform the ‘afterEach’ hook', () ->
            assert.isTrue spies.afterEachSpy.calledOnce

          it 'should not perform any other hook', () ->
            for own spyName, spy of spies
              break if spyName == 'beforeAllSpy'
              break if spyName == 'beforeEachSpy'
              break if spyName == 'beforeSpy'
              break if spyName == 'beforeEachValidationSpy'
              break if spyName == 'beforeValidationSpy'
              break if spyName == 'after'
              break if spyName == 'afterEach'
              assert.isFalse spies[spyName].called, spyName

          it 'should not perform any other transaction', () ->
            assert.isTrue serverNock1.isDone(), 'first resource'
            assert.isFalse serverNock2.isDone(), 'second resource'

          it 'should return the error', () ->
            assert.include returnedError.message, 'after each'

        describe 'after ‘afterAll’ hook is executed', () ->
          beforeEach (done) ->
            hookHandlerError = new Error 'handler died in after all'

            hooks.afterAll (data, callback) ->
             runner.hookHandlerError = hookHandlerError
             callback()

            runner.executeAllTransactions transactions, hooks, (error) ->
              #setting expectation for this error below in each describe block
              returnedError = error
              done()

          it 'should perform the ‘beforeAll’ hook', () ->
            assert.isTrue spies.beforeAllSpy.called

          it 'should perform the ‘beforeEach’ hook', () ->
            assert.isTrue spies.beforeEachSpy.calledTwice

          it 'should perform the ‘before’ hook', () ->
            assert.isTrue spies.beforeSpy.calledTwice

          it 'should perform the ‘beforeEachValidation’ hook', () ->
            assert.isTrue spies.beforeEachValidationSpy.calledTwice

          it 'should perform the ‘beforeValidation’ hook', () ->
            assert.isTrue spies.beforeValidationSpy.calledTwice

          it 'should perform the ‘afterEach’ hook', () ->
            assert.isTrue spies.afterEachSpy.calledTwice

          it 'should perform the ‘after’ hook', () ->
            assert.isTrue spies.afterSpy.calledTwice

          it 'should perform the ‘afterAll’ hook', () ->
            assert.isTrue spies.afterAllSpy.calledOnce

          it 'should perform both transactions', () ->
            assert.isTrue serverNock1.isDone(), 'first resource'
            assert.isTrue serverNock2.isDone(), 'second resource'

          it 'should return the error', () ->
            assert.include returnedError.message, 'after all'

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

    beforeEach (done) ->
      transaction = clone {
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
          body: '{\n  "type": "bulldozer",\n "name": "willy",\n  "id": "5229c6e8e4b0bd7dbb07e29c"\n}\n'
          statusCode: '202'
        origin:
          resourceGroupName: 'Group Machine'
          resourceName: 'Machine'
          actionName: 'Delete Message'
          exampleName: 'Bogus example name'
        fullPath: '/machines'
      }

      server = nock('http://localhost:3000').
        post('/machines', {"type":"bulldozer","name":"willy"}).
        reply transaction['expected']['statusCode'],
          transaction['expected']['body'],
          {'Content-Type': 'application/json'}

      transactions = {}
      transactions[transaction.name] = clone transaction, false
      runner = new Runner(configuration)
      addHooks runner, transactions, done

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
        runner.hooks.beforeValidationHooks =
          'Group Machine > Machine > Delete Message > Bogus example name': [
            (transaction) ->
              loggerStub.info "beforeValidation"
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
          assert.ok loggerStub.info.calledWith "beforeValidation"
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
        runner.hooks.beforeValidationHooks =
          'Group Machine > Machine > Delete Message > Bogus example name' : [
            (transaction) ->
              loggerStub.info "beforeValidation"
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
          assert.ok loggerStub.info.calledWith "beforeValidation"
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

    describe '‘*All’ hooks with legacy async interface (fist argument is a callback)', () ->
      describe 'with a ‘beforeAll’ hook', () ->
        legacyApiFunction = (callback) ->
          callback()
        anotherLegacyApiFunction = (cb) ->
          cb()

        beforeAllStub = sinon.spy(legacyApiFunction)
        beforeAllStubAnother = sinon.spy anotherLegacyApiFunction

        beforeEach () ->
          runner.hooks.beforeAll beforeAllStub
          runner.hooks.beforeAll beforeAllStubAnother

        it 'should run the hooks', (done) ->
          runner.executeAllTransactions [], runner.hooks, () ->
            assert.ok beforeAllStub.called
            assert.ok beforeAllStubAnother.called
            done()

      describe 'with an ‘afterAll’ hook', () ->
        legacyApiFunction = (callback) ->
          callback()
        anotherLegacyApiFunction = (cb) ->
          cb()

        afterAllStub = sinon.spy legacyApiFunction
        afterAllStubAnother = sinon.spy anotherLegacyApiFunction

        beforeEach () ->
          runner.hooks.afterAll afterAllStub
          runner.hooks.afterAll afterAllStubAnother

        it 'should run the hooks', (done) ->
          runner.executeAllTransactions [], runner.hooks, () ->
            assert.ok afterAllStub.called
            assert.ok afterAllStubAnother.called
            done()

      describe 'with multiple hooks for the same events', () ->
        legacyApiFunction = (callback) ->
          callback()

        beforeAllStub1 = sinon.spy(legacyApiFunction)
        beforeAllStub2 = sinon.spy(legacyApiFunction)
        afterAllStub1 = sinon.spy(legacyApiFunction)
        afterAllStub2 = sinon.spy(legacyApiFunction)

        beforeEach () ->
          runner.hooks.beforeAll beforeAllStub1
          runner.hooks.afterAll afterAllStub1
          runner.hooks.afterAll afterAllStub2
          runner.hooks.beforeAll beforeAllStub2

        it 'should run all the events in order', (done) ->
          runner.executeAllTransactions [], runner.hooks, () ->
            assert.ok beforeAllStub1.calledBefore(beforeAllStub2)
            assert.ok beforeAllStub2.called
            assert.ok beforeAllStub2.calledBefore(afterAllStub1)
            assert.ok afterAllStub1.calledBefore(afterAllStub2)
            assert.ok afterAllStub2.called
            done()

    describe '‘*All’ hooks with standard async API (first argument transactions, second callback)', () ->

      describe 'with a ‘beforeAll’ hook', () ->
        hook = (transactions, callback) ->
          callback()

        beforeAllStub = sinon.spy(hook)

        beforeEach () ->
          runner.hooks.beforeAll beforeAllStub

        it 'should run the hooks', (done) ->
          runner.executeAllTransactions [], runner.hooks, () ->
            assert.ok beforeAllStub.called
            done()

      describe 'with an ‘afterAll’ hook', () ->
        hook = (transactions, callback) ->
          callback()

        afterAllStub = sinon.spy hook

        beforeEach () ->
          runner.hooks.afterAll afterAllStub

        it 'should run the hooks', (done) ->
          runner.executeAllTransactions [], runner.hooks, () ->
            assert.ok afterAllStub.called
            done()

      describe 'with multiple hooks for the same events', () ->
        hook = (transactions, callback) ->
          callback()

        beforeAllStub1 = sinon.spy(hook)
        beforeAllStub2 = sinon.spy(hook)
        afterAllStub1 = sinon.spy(hook)
        afterAllStub2 = sinon.spy(hook)

        beforeEach () ->
          runner.hooks.beforeAll beforeAllStub1
          runner.hooks.afterAll afterAllStub1
          runner.hooks.afterAll afterAllStub2
          runner.hooks.beforeAll beforeAllStub2

        it 'should run all the events in order', (done) ->
          runner.executeAllTransactions [], runner.hooks, () ->
            assert.ok beforeAllStub1.calledBefore(beforeAllStub2)
            assert.ok beforeAllStub2.called
            assert.ok beforeAllStub2.calledBefore(afterAllStub1)
            assert.ok afterAllStub1.calledBefore(afterAllStub2)
            assert.ok afterAllStub2.called
            done()

    describe '‘*All’ hooks with sandboxed API (functions as strings)', () ->
      describe 'with a ‘beforeAll’ hook', () ->

        beforeEach () ->
          sinon.stub configuration.emitter, 'emit'

        afterEach () ->
          configuration.emitter.emit.restore()

        it 'should run the code and emit an error', (done) ->
          functionString = """
          function(transactions){
            throw(new Error('Exploded inside sandbox'));
          }
          """
          runner.hooks.beforeAll functionString

          runner.executeAllTransactions [], runner.hooks, () ->
            call = configuration.emitter.emit.getCall(0)
            assert.ok configuration.emitter.emit.calledWith "test error"
            done()

        it 'should not have access to require', (done) ->
          functionString = """
          function(transactions){
            require('fs');
          }
          """
          runner.hooks.beforeAll functionString

          runner.executeAllTransactions [], runner.hooks, () ->
            call = configuration.emitter.emit.getCall(0)
            assert.ok configuration.emitter.emit.calledWith "test error"
            assert.include call.args[1].message, 'require'
            done()

        it 'should not have aceess to current context', (done) ->
          contextVar = "this"
          functionString = """
          function(transaction){
            contextVar = "that";
          }
          """
          runner.hooks.beforeAll functionString

          runner.executeAllTransactions [], runner.hooks, () ->
            assert.equal contextVar, 'this'
            done()

        it 'should have access to the hook stash', (done) ->
          functionString = """
          function(transaction){
            stash['prop'] = 'that';
          }
          """
          runner.hooks.beforeAll functionString

          runner.executeAllTransactions [], runner.hooks, () ->
            assert.notOk configuration.emitter.emit.calledWith "test error"
            done()

        it 'should be able to modify hook stash', (done) ->
          functionString = """
          function(transaction){
            stash['prop'] = 'that';
          }
          """
          runner.hooks.beforeAll functionString

          runner.executeAllTransactions [], runner.hooks, () ->
            assert.notOk configuration.emitter.emit.calledWith "test error"
            assert.property runner.hookStash, 'prop'
            done()

        it 'should be able to modify transactions', (done) ->
          functionString = """
          function(transactions){
            transactions['prop'] = 'that';
          }
          """
          runner.hooks.beforeAll functionString

          transactions = {'some': 'mess'}

          runner.executeAllTransactions transactions, runner.hooks, () ->
            call = configuration.emitter.emit.getCall(0)
            assert.notOk configuration.emitter.emit.calledWith "test error"
            assert.property transactions, 'prop'
            done()

        it 'should be able to call "log" from inside the function', (done) ->
          functionString = """
          function(transactions){
            log(transactions[Object.keys(transactions)[0]]);
            transactions['prop'] = 'that';
          }
          """
          runner.hooks.beforeAll functionString

          transactions = {'some': 'mess'}

          runner.executeAllTransactions transactions, runner.hooks, () ->
            call = configuration.emitter.emit.getCall(0)
            assert.notOk configuration.emitter.emit.calledWith "test error"
            assert.property transactions, 'prop'
            assert.isArray runner.logs
            assert.lengthOf runner.logs, 1
            assert.propertyVal runner.logs[0], 'content', 'mess'
            done()

    describe '*Each hooks with standard async API (first argument transactions, second callback)', () ->

      transactionsForExecution = []

      before () ->
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

        for i in [1,2]
          clonedTransaction = clone transaction
          clonedTransaction['name'] = clonedTransaction['name'] + " #{i}"
          transactionsForExecution.push clonedTransaction

      describe 'with a ‘beforeEach’ hook', () ->
        hook = (transactions, callback) ->
          callback()

        beforeEachStub = sinon.spy(hook)

        beforeEach () ->
          runner.hooks.beforeEach beforeEachStub
          server = nock('http://localhost:3000').
            post('/machines', {"type":"bulldozer","name":"willy"}).
            reply transactionsForExecution[0]['expected']['statusCode'],
              transactionsForExecution[0]['expected']['body'],
              {'Content-Type': 'application/json'}

        afterEach () ->
          beforeEachStub.reset()
          nock.cleanAll()

        it 'should run the hooks', (done) ->
          runner.executeAllTransactions transactionsForExecution, runner.hooks, () ->
            assert.ok beforeEachStub.called
            done()

        it 'should run the hook for each transaction', (done) ->
          runner.executeAllTransactions transactionsForExecution, runner.hooks, () ->
            assert.equal beforeEachStub.callCount, transactionsForExecution.length
            done()

      describe 'with a ‘beforeEachValidation’ hook', () ->
        hook = (transaction, callback) ->
          transaction.real.statusCode = '403';
          callback()

        beforeEachValidationStub = sinon.spy(hook)

        beforeEach () ->
          runner.hooks.beforeEachValidation beforeEachValidationStub
          server = nock('http://localhost:3000').
            post('/machines', {"type":"bulldozer","name":"willy"}).
            reply transactionsForExecution[0]['expected']['statusCode'],
              transactionsForExecution[0]['expected']['body'],
              {'Content-Type': 'application/json'}

        afterEach () ->
          beforeEachValidationStub.reset()
          nock.cleanAll()

        it 'should run the hooks', (done) ->
          transaction = clone(transactionsForExecution[0]);
          runner.executeAllTransactions [transaction], runner.hooks, () ->
            assert.ok beforeEachValidationStub.called
            assert.equal transaction.test.status, 'fail'
            done()

        it 'should run before gavel', (done) ->
          transaction = clone(transactionsForExecution[0]);
          transaction.expected.statusCode = '403';
          runner.executeAllTransactions [transaction], runner.hooks, () ->
            assert.equal transaction.test.status, 'pass'
            done()

        it 'should run the hook for each transaction', (done) ->
          runner.executeAllTransactions transactionsForExecution, runner.hooks, () ->
            assert.equal beforeEachValidationStub.callCount, transactionsForExecution.length
            done()

      describe 'with a ‘afterEach’ hook', () ->
        hook = (transactions, callback) ->
          callback()

        afterEachStub = sinon.spy(hook)

        beforeEach () ->
          runner.hooks.afterEach afterEachStub
          server = nock('http://localhost:3000').
            post('/machines', {"type":"bulldozer","name":"willy"}).
            reply transactionsForExecution[0]['expected']['statusCode'],
              transactionsForExecution[0]['expected']['body'],
              {'Content-Type': 'application/json'}

        afterEach () ->
          afterEachStub.reset()
          nock.cleanAll()

        it 'should run the hooks', (done) ->
          runner.executeAllTransactions transactionsForExecution, runner.hooks, () ->
            assert.ok afterEachStub.called
            done()

        it 'should run the hook for each transaction', (done) ->
          runner.executeAllTransactions transactionsForExecution, runner.hooks, () ->
            assert.equal afterEachStub.callCount, transactionsForExecution.length
            done()

      describe 'with multiple hooks for the same events', () ->
        legacyApiFunction = (transactions, callback) ->
          callback()

        beforeAllStub1 = sinon.spy(legacyApiFunction)
        beforeAllStub2 = sinon.spy(legacyApiFunction)
        afterAllStub1 = sinon.spy(legacyApiFunction)
        afterAllStub2 = sinon.spy(legacyApiFunction)

        beforeEach () ->
          runner.hooks.beforeAll beforeAllStub1
          runner.hooks.afterAll afterAllStub1
          runner.hooks.afterAll afterAllStub2
          runner.hooks.beforeAll beforeAllStub2

        it 'should run all the events in order', (done) ->
          runner.executeAllTransactions [], runner.hooks, () ->
            assert.ok beforeAllStub1.calledBefore(beforeAllStub2)
            assert.ok beforeAllStub2.called
            assert.ok afterAllStub1.calledBefore(afterAllStub2)
            assert.ok afterAllStub2.called
            done()

    describe 'with ‘before’ hook that throws an error', () ->
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

    describe 'with ‘after’ hook that throws an error', () ->
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

    describe 'with ‘before’ hook that throws a chai expectation error', () ->
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

      it 'should add fail message as a error under `general` to the results on transaction', (done) ->
        runner.executeAllTransactions [transaction], runner.hooks, () ->
          messages = transaction['results']['general']['results'].map (value, index) -> value['message']
          assert.include messages.join(), 'expected false to be truthy'
          done()

      it 'should add fail message as a error under `general` to the results on test passed to the emitter', (done) ->
          runner.executeAllTransactions [transaction], runner.hooks, () ->
            messages = []
            callCount = configuration.emitter.emit.callCount
            for callNo in [0.. callCount - 1]
              messages.push configuration.emitter.emit.getCall(callNo).args[1]['results']['general']['results'].map(
                (value, index) -> value['message']
              )
            assert.include messages.join(), 'expected false to be truthy'
            done()

    describe 'with ‘after’ hook that throws a chai expectation error', () ->
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

      it 'should add fail message as a error under `general` to the results on transaction', (done) ->
        runner.executeAllTransactions [transaction], runner.hooks, () ->
          messages = transaction['results']['general']['results'].map (value, index) -> value['message']
          assert.include messages.join(), 'expected false to be truthy'
          done()

      it 'should add fail message as a error under `general` to the results on test passed to the emitter', (done) ->
          runner.executeAllTransactions [transaction], runner.hooks, () ->
            messages = []
            callCount = configuration.emitter.emit.callCount
            for callNo in [0.. callCount - 1]
              messages.push configuration.emitter.emit.getCall(callNo).args[1]['results']['general']['results'].map(
                (value, index) -> value['message']
              )
            assert.include messages.join(), 'expected false to be truthy'
            done()

    describe 'with hook failing the transaction', () ->
      describe 'in ‘before’ hook', () ->
        clonedTransaction = null
        beforeEach () ->
          clonedTransaction = clone(transaction)
          runner.hooks.beforeHooks =
            'Group Machine > Machine > Delete Message > Bogus example name' : [
              (hookTransaction) ->
                hookTransaction.fail = "Message before"
            ]
          sinon.stub configuration.emitter, 'emit'

        afterEach () ->
          configuration.emitter.emit.restore()

        it 'should fail the test', (done) ->
          runner.executeAllTransactions [clonedTransaction], runner.hooks, () ->
            assert.ok configuration.emitter.emit.calledWith "test fail"
            done()

        it 'should not run the transaction', (done) ->
          runner.executeAllTransactions [clonedTransaction], runner.hooks, () ->
            assert.notOk server.isDone()
            done()

        it 'should pass the failing message to the emitter', (done) ->
          runner.executeAllTransactions [clonedTransaction], runner.hooks, () ->
            messages = []
            callCount = configuration.emitter.emit.callCount
            for callNo in [0.. callCount - 1]
              messages.push configuration.emitter.emit.getCall(callNo).args[1].message
            assert.include messages.join(), "Message before"
            done()

        it 'should mention before hook in the error message', (done) ->
          runner.executeAllTransactions [clonedTransaction], runner.hooks, () ->
            messages = []
            callCount = configuration.emitter.emit.callCount
            for callNo in [0.. callCount - 1]
              messages.push configuration.emitter.emit.getCall(callNo).args[1].message
            assert.include messages.join(), "Failed in before hook:"
            done()

        it 'should add fail message as a error under `general` to the results on the transaction', (done) ->
          runner.executeAllTransactions [clonedTransaction], runner.hooks, () ->
            messages = clonedTransaction['results']['general']['results'].map (value, index) -> value['message']
            assert.include messages.join(), 'Message before'
            done()

        it 'should add fail message as a error under `general` to the results on test passed to the emitter', (done) ->
            runner.executeAllTransactions [clonedTransaction], runner.hooks, () ->
              messages = []
              callCount = configuration.emitter.emit.callCount
              for callNo in [0.. callCount - 1]
                messages.push configuration.emitter.emit.getCall(callNo).args[1]['results']['general']['results'].map(
                  (value, index) -> value['message']
                )
              assert.include messages.join(), 'Message before'
              done()

        describe 'when message is set to fail also in ‘after’ hook', () ->
          clonedTransaction = null
          beforeEach () ->
            clonedTransaction = clone(transaction)
            runner.hooks.afterHooks =
              'Group Machine > Machine > Delete Message > Bogus example name' : [
                (hookTransaction) ->
                  hookTransaction.fail = "Message after"
              ]

          it 'should not pass the failing message to the emitter', (done) ->
            runner.executeAllTransactions [clonedTransaction], runner.hooks, () ->
              messages = []
              callCount = configuration.emitter.emit.callCount
              for callNo in [0.. callCount - 1]
                messages.push configuration.emitter.emit.getCall(callNo).args[1].message
              assert.notInclude messages.join(), "Message after fail"
              done()

          it 'should not mention after hook in the error message', (done) ->
            runner.executeAllTransactions [clonedTransaction], runner.hooks, () ->
              messages = []
              callCount = configuration.emitter.emit.callCount
              for callNo in [0.. callCount - 1]
                messages.push configuration.emitter.emit.getCall(callNo).args[1].message
              assert.notInclude messages.join(), "Failed in after hook:"
              done()

          it 'should not add fail message as a error under `general` to the results on the transaction', (done) ->
            runner.executeAllTransactions [clonedTransaction], runner.hooks, () ->
              messages = clonedTransaction['results']['general']['results'].map (value, index) -> value['message']
              assert.notInclude messages.join(), 'Message after fail'
              done()

          it 'should not add fail message as a error under `general` to the results on test passed to the emitter', (done) ->
              runner.executeAllTransactions [clonedTransaction], runner.hooks, () ->
                messages = []
                callCount = configuration.emitter.emit.callCount
                for callNo in [0.. callCount - 1]
                  messages.push configuration.emitter.emit.getCall(callNo).args[1]['results']['general']['results'].map(
                    (value, index) -> value['message']
                  )
                assert.notInclude messages.join(), 'Message after fail'
                done()

      describe 'in ‘after’ hook when transaction fails ', () ->
        modifiedTransaction = {}
        beforeEach () ->
          modifiedTransaction = clone(transaction)
          modifiedTransaction['expected']['statusCode'] = "303"

          runner.hooks.afterHooks =
            'Group Machine > Machine > Delete Message > Bogus example name' : [
              (hookTransaction) ->
                hookTransaction.fail = "Message after fail"
            ]
          sinon.stub configuration.emitter, 'emit'

        afterEach () ->
          configuration.emitter.emit.reset()
          configuration.emitter.emit.restore()

        it 'should make the request', (done) ->
          runner.executeAllTransactions [modifiedTransaction], runner.hooks, () ->
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
          runner.executeAllTransactions [modifiedTransaction], runner.hooks, () ->
            messages = []
            callCount = configuration.emitter.emit.callCount
            for callNo in [0.. callCount - 1]
              messages.push configuration.emitter.emit.getCall(callNo).args[1].message
            assert.notInclude messages, "Failed in after hook:"
            done()

        it 'should not add fail message as a error under `general` to the results on the transaction', (done) ->
          runner.executeAllTransactions [modifiedTransaction], runner.hooks, () ->
            messages = modifiedTransaction['results']['general']['results'].map (value, index) -> value['message']
            assert.notInclude messages.join(), 'Message after fail'
            done()

        it 'should not add fail message as a error under `general` to the results on test passed to the emitter', (done) ->
            runner.executeAllTransactions [modifiedTransaction], runner.hooks, () ->
              messages = []
              callCount = configuration.emitter.emit.callCount
              for callNo in [0.. callCount - 1]
                messages.push configuration.emitter.emit.getCall(callNo).args[1]['results']['general']['results'].map(
                  (value, index) -> value['message']
                )
              assert.notInclude messages.join(), 'Message after fail'
              done()

      describe 'in ‘after’ hook when transaction passes ', () ->
        clonedTransaction = null
        beforeEach () ->
          clonedTransaction = clone transaction
          runner.hooks.afterHooks =
            'Group Machine > Machine > Delete Message > Bogus example name' : [
              (hookTransaction) ->
                hookTransaction.fail = "Message after pass"
            ]
          sinon.stub configuration.emitter, 'emit'

        afterEach () ->
          configuration.emitter.emit.reset()
          configuration.emitter.emit.restore()

        it 'should make the request', (done) ->
          runner.executeAllTransactions [clonedTransaction], runner.hooks, () ->
            assert.ok server.isDone()
            done()

        it 'it should fail the test', (done) ->
          runner.executeAllTransactions [clonedTransaction], runner.hooks, () ->
            assert.ok configuration.emitter.emit.calledWith "test fail"
            done()

        it 'it should not pass the test', (done) ->
          runner.executeAllTransactions [clonedTransaction], runner.hooks, () ->
            assert.notOk configuration.emitter.emit.calledWith "test pass"
            done()

        it 'it should pass the failing message to the emitter', (done) ->
          runner.executeAllTransactions [clonedTransaction], runner.hooks, () ->
            messages = []
            callCount = configuration.emitter.emit.callCount
            for callNo in [0.. callCount - 1]
              messages.push configuration.emitter.emit.getCall(callNo).args[1].message
            assert.include messages.join(), "Message after pass"
            done()

        it 'should mention after hook in the error message', (done) ->
          runner.executeAllTransactions [clonedTransaction], runner.hooks, () ->
            messages = []
            callCount = configuration.emitter.emit.callCount
            for callNo in [0.. callCount - 1]
              messages.push configuration.emitter.emit.getCall(callNo).args[1].message
            assert.include messages.join(), "Failed in after hook:"
            done()

        it 'should set transaction test status to failed', (done) ->
          runner.executeAllTransactions [clonedTransaction], runner.hooks, () ->
            assert.equal clonedTransaction.test.status, 'fail'
            done()

        it 'should add fail message as a error under `general` to the results', (done) ->
          runner.executeAllTransactions [clonedTransaction], runner.hooks, () ->
            messages = clonedTransaction['results']['general']['results'].map (value, index) -> value['message']
            assert.include messages.join(), 'Message after pass'
            done()

        it 'should not add fail message as a error under `general` to the results on test passed to the emitter', (done) ->
            runner.executeAllTransactions [clonedTransaction], runner.hooks, () ->
              messages = []
              callCount = configuration.emitter.emit.callCount
              for callNo in [0.. callCount - 1]
                messages.push configuration.emitter.emit.getCall(callNo).args[1]['results']['general']['results'].map(
                  (value, index) -> value['message']
                )
              assert.include messages.join(), 'Message after pass'
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
        runner.executeAllTransactions [transaction], runner.hooks, (error) ->
          done error if error
          assert.ok configuration.emitter.emit.calledWith "test pass"
          done()

    describe 'with hook modifying the transaction body and backend Express app using the body parser', () ->
      before () ->
        nock.enableNetConnect()

      after () ->
        nock.disableNetConnect()

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

  describe 'runHooksForData(hooks, data, legacy = true, callback)', () ->
    describe 'when legacy is false', () ->
      describe 'and an exception in hook appears', () ->
        before () ->
          configuration =
            emitter: new EventEmitter()

          runner = new Runner configuration

          sinon.stub configuration.emitter, 'emit'

        after () ->
          configuration.emitter.emit.restore()

        it 'should be called with warning containing error message', (done) ->
          hook = """
          function(transcaction){
            throw(new Error("Throwed message"))
          }
          """

          runner.runHooksForData [hook], {}, false, () ->
            assert.ok configuration.emitter.emit.calledWith "test error"
            messages = []
            callCount = configuration.emitter.emit.callCount
            for callNo in [0.. callCount - 1]
              messages.push configuration.emitter.emit.getCall(callNo).args[1].message
            done()

  describe 'runHook(hook, transaction, callback)', () ->
    describe 'when sandbox mode is on (hook function is a string)', () ->

      before () ->
        configuration = {}

        runner = new Runner configuration

      it 'should execute the code of hook', (done) ->
        hook = """
        function(transaction){
          throw(new Error('Exploded inside a sandboxed hook'));
        }
        """
        runner.runHook hook, {}, (err) ->
          assert.include err, 'sandbox'
          done()

      it 'should not have aceess to current context', (done) ->
        contextVar = "this"
        hook = """
        function(transaction){
          contextVar = "that";
        }
        """
        runner.runHook hook, {}, () ->
          assert.equal contextVar, 'this'
          done()

      it 'should not have access to require', (done) ->
        hook = """
        function(transaction){
          require('fs');
        }
        """
        runner.runHook hook, {}, (err) ->
          assert.include err, 'require'
          done()

      it 'should have access to the hook stash', (done) ->
        hook = """
        function(transaction){
          stash['prop'] = 'that';
        }
        """
        runner.runHook hook, {}, (err) ->
          return done new Error err if err
          assert.isUndefined err
          done()

      it 'should be able to modify hook stash', (done) ->
        hook = """
        function(transaction){
          stash['prop'] = 'that';
        }
        """
        runner.runHook hook, {}, (err) ->
          return done new Error err if err
          assert.property runner.hookStash, 'prop'
          done()


      it 'should be able to modify hook stash multiple times', (done) ->
        hook = """
        function(transaction){
          stash['prop'] = 'that';
        }
        """
        runner.runHook hook, {}, (err) ->
          return done new Error err if err
          assert.property runner.hookStash, 'prop'

          hook = """
          function(transaction){
            stash['prop2'] = 'that';
          }
          """
          runner.runHook hook, {}, (err) ->
            return done new Error err if err
            assert.property runner.hookStash, 'prop'
            assert.property runner.hookStash, 'prop2'

            done()

      it 'should be able to modify the transaction', (done) ->
        hook = """
        function(transaction){
          transaction['prop'] = 'that';
        }
        """
        transaction = {'some': 'mess'}
        runner.runHook hook, transaction, (err) ->
          return done new Error err if err
          assert.property transaction, 'prop'
          done()

      it 'should have access to log', (done) ->
        hook = """
        function(transaction){
          log('log test');
        }
        """
        runner.runHook hook, {}, (err) ->
          return done new Error err if err
          done()

      it 'should NOT have access to console', (done) ->
        hook = """
        function(transaction){
          console.log('console test');
        }
        """
        runner.runHook hook, {}, (err) ->
          assert.isDefined err
          assert.include err, 'console'
          done()
