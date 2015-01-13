require 'coffee-errors'
{EventEmitter} = require 'events'
{assert} = require 'chai'
nock = require 'nock'
proxyquire = require 'proxyquire'
sinon = require 'sinon'
htmlStub = require 'html'
advisableStub = require 'advisable'
addHooksStub = sinon.spy require '../../src/add-hooks'
loggerStub = require '../../src/logger'
httpStub = require 'http'
httpsStub = require 'https'

Runner = proxyquire  '../../src/transaction-runner', {
  'html': htmlStub,
  'advisable': advisableStub,
  './add-hooks': addHooksStub
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
      sinon.spy advisableStub.async, 'call'
      runner = new Runner(configuration)

    afterEach () ->
      sinon.spy advisableStub.async.call.restore()

    it 'should copy configuration', () ->
      assert.ok runner.configuration.server

    it 'should add advice', () ->
      assert.ok advisableStub.async.call.called

    it 'should add hooks', () ->
      assert.ok addHooksStub.called

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
          resourceGroupName: "Group Machine"
          resourceName: "Machine"
          actionName: "Delete Message"
          exampleName: "Bogus example name"

      runner = new Runner(configuration)

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
