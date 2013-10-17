{assert} = require 'chai'
nock = require 'nock'
proxyquire = require 'proxyquire'
sinon = require 'sinon'

executeTransaction = require  '../../src/execute-transaction'
CliReporter = require '../../src/cli-reporter'

describe 'executeTransaction(transaction, callback)', () ->
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
      reporters: []
      options: []

  beforeEach () ->
    nock.disableNetConnect()

  afterEach () ->
    nock.enableNetConnect()
    nock.cleanAll()


  data = {}
  server = {}

  describe 'backend responds as it should', () ->
    beforeEach () ->
      server = nock('http://localhost:3000').
        post('/machines', {"type":"bulldozer","name":"willy"}).
        reply transaction['response']['status'],
          transaction['response']['body'],
          {'Content-Type': 'application/json'}
      transaction['configuration']['reporters'] = [new CliReporter()]


    it 'should perform the request', (done) ->
      executeTransaction transaction, () ->
        assert.ok server.isDone()
        done()

    it 'should not return an error', (done) ->
      executeTransaction transaction, (error) ->
        assert.notOk error
        done()

  describe 'backend responds with non valid response', () ->
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

  describe 'when dry run', () ->
    before () ->
      transaction['configuration']['options'] = {'dry-run' : true}
      server = nock('http://localhost:3000').
        post('/machines', {"type":"bulldozer","name":"willy"}).
        reply 202, "Accepted"

    it 'should not perform any HTTP request', (done) ->
      executeTransaction transaction, () ->
        assert.notOk server.isDone()
        done()

