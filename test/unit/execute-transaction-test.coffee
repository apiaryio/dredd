{assert} = require 'chai'
nock = require 'nock'
proxyquire = require 'proxyquire'
sinon = require 'sinon'

cliUtilsStub = require '../../src/cli-utils'
executeTransaction = proxyquire  '../../src/execute-transaction', {
  './cli-utils': cliUtilsStub
}


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
  
  beforeEach () ->
    sinon.stub cliUtilsStub, 'exit'
    #sinon.stub cliUtilsStub, 'log'
    #sinon.stub cliUtilsStub, 'error'
    nock.disableNetConnect()

  afterEach () -> 
    cliUtilsStub.exit.restore()
    #cliUtilsStub.log.restore()
    #cliUtilsStub.error.restore()   
    nock.enableNetConnect()
    nock.cleanAll()

  
  data = {}
  server = {}

  describe.only 'backend responds as it should', () ->
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

    it 'should not exit', (done) ->
      executeTransaction transaction, () ->
        assert.notOk cliUtilsStub.exit.called
        done()

  describe 'when dry run', () ->
    before () ->
      transaction['configuration']['dryRun'] = true
      server = nock('http://localhost:3000').
        post('/machines', {"type":"bulldozer","name":"willy"}).
        reply 202, "Accepted"

    it 'should not perform any HTTP request', (done) ->
      executeTransaction transaction, () ->
        assert.notOk server.isDone()
        done()      
      

