require 'coffee-errors'
{EventEmitter} = require 'events'
{assert} = require 'chai'
nock = require 'nock'
proxyquire = require 'proxyquire'
sinon = require 'sinon'
htmlStub = require 'html'

executeTransaction = proxyquire  '../../src/execute-transaction', {
  'html': htmlStub
}

CliReporter = require '../../src/reporters/cli-reporter'


describe 'executeTransaction(transaction, callback)', () ->
  transaction = {}
  data = {}
  server = {}

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
        actionNames: "Delete Message"
        exampleName: "Bogus example name"
      configuration:
        server: 'http://localhost:3000'
        emitter: new EventEmitter()
        options:
          'dry-run': false
          method: []
          header: []
          reporter:  []

    transaction.configuration.options.reporter = [new CliReporter(transaction.configuration.emitter, {}, {}, false, false)]

    nock.disableNetConnect()

  afterEach () ->
    nock.enableNetConnect()
    nock.cleanAll()

  describe 'setting of content-length header', () ->
    describe 'when content-length header is not present in the specified request', () ->
      beforeEach () ->
        server = nock('http://localhost:3000').
          post('/machines', {"type":"bulldozer","name":"willy"}).
          reply transaction['response']['status'],
            transaction['response']['body'],
            {'Content-Type': 'application/json'}
        nock.recorder.rec(true)

      it 'should send content length header ', (done) ->
        executeTransaction transaction, (error, req, res) ->
          assert.isDefined req._headers['content-length']
          done()

      it 'sent content-length header should have proper value', (done) ->
        executeTransaction transaction, (error, req, res) ->
          assert.equal req._headers['content-length'], 44
          done()


    describe 'when content-length header is present in the specified request', () ->
      beforeEach () ->
        server = nock('http://localhost:3000').
          post('/machines', {"type":"bulldozer","name":"willy"}).
          reply transaction['response']['status'],
            transaction['response']['body'],
            {'Content-Type': 'application/json'}

      it 'should not overwrite specified value', (done) ->
        transaction['request']['headers']['Content-Length'] = {}
        transaction['request']['headers']['Content-Length']['value'] = '333'
        executeTransaction transaction, (error, req, res) ->
          assert.equal req._headers['content-length'], '333'
          done()

      it 'matching of content-length header in specification should be case insensitive', (done) ->
        transaction['request']['headers']['CONTENT-LENGTH'] = {}
        transaction['request']['headers']['CONTENT-LENGTH']['value'] = '777'
        executeTransaction transaction, (error, req, res) ->
          assert.equal req._headers['content-length'], '777'
          done()


      it 'should not add another content-length header to the real request', (done) ->
        transaction['request']['headers']['content-length'] = {}
        transaction['request']['headers']['content-length']['value'] = '445'
        executeTransaction transaction, (error, req, res) ->
          assert.equal req._headers['content-length'], '445'
          done()



  describe 'when backend responds as it should', () ->
    beforeEach () ->
      server = nock('http://localhost:3000').
        post('/machines', {"type":"bulldozer","name":"willy"}).
        reply transaction['response']['status'],
          transaction['response']['body'],
          {'Content-Type': 'application/json'}

    it 'should perform the request', (done) ->
      executeTransaction transaction, () ->
        assert.ok server.isDone()
        done()

    it 'should not return an error', (done) ->
      executeTransaction transaction, (error) ->
        assert.notOk error
        done()

  describe 'when backend responds with non valid response', () ->
    beforeEach () ->
      server = nock('http://localhost:3000').
        post('/machines', {"type":"bulldozer","name":"willy"}).
        reply transaction['response']['status'],
          'Foo bar',
          {'Content-Type': 'text/plain'}


    it 'should perform the request', (done) ->
      executeTransaction transaction, () ->
        assert.ok server.isDone()
        done()

  describe 'when there are global headers in the configuration', () ->
    beforeEach () ->
      server = nock('http://localhost:3000').
        post('/machines', {"type":"bulldozer","name":"willy"}).
        matchHeader('X-Header', 'foo').
        reply transaction['response']['status'],
          transaction['response']['body'],
          {'Content-Type': 'application/json'}

      transaction['configuration']['options']['header'] = ['X-Header:foo']

    it 'should include the global headers in the request', (done) ->
      executeTransaction transaction, () ->
        assert.ok server.isDone()
        done()

  describe 'when only certain methods are allowed by the configuration', () ->
    beforeEach () ->
      server = nock('http://localhost:3000').
        post('/machines', {"type":"bulldozer","name":"willy"}).
        matchHeader('X-Header', 'foo').
        reply transaction['response']['status'],
          transaction['response']['body'],
          {'Content-Type': 'application/json'}
      sinon.stub transaction.configuration.emitter, 'emit'
      transaction['configuration']['options']['method'] = ['GET']

    afterEach () ->
      transaction.configuration.emitter.emit.restore()
      transaction['configuration']['options']['method'] = []

    it 'should only perform those requests', (done) ->
      executeTransaction transaction, () ->
        assert.ok transaction.configuration.emitter.emit.calledWith 'test skip'
        done()

  describe 'when server uses https', () ->
    beforeEach () ->
      server = nock('https://localhost:3000').
        post('/machines', {"type":"bulldozer","name":"willy"}).
        reply transaction['response']['status'],
          transaction['response']['body'],
          {'Content-Type': 'application/json'}
      transaction.configuration.server = 'https://localhost:3000'

    it 'should make the request with https', (done) ->
      executeTransaction transaction, () ->
        assert.ok  server.isDone()
        done()

  describe 'when dry run', () ->
    beforeEach () ->
      transaction['configuration']['options']['dry-run'] = true
      server = nock('http://localhost:3000').
        post('/machines', {"type":"bulldozer","name":"willy"}).
        reply 202, "Accepted"

    it 'should not perform any HTTP request', (done) ->
      executeTransaction transaction, () ->
        assert.notOk server.isDone()
        done()

