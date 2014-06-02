{assert} = require 'chai'
{EventEmitter} = require 'events'
ApiaryReporter = require '../../../src/reporters/apiary-reporter'
nock = require 'nock'

describe 'ApiaryReporter', () ->


  stats = {}
  tests = []
  test = {}
  emitter = {}
  baseReporter = {}

  beforeEach (done) ->
    stats =
      tests: 0
      failures: 0
      errors: 0
      passes: 0
      skipped: 0
      start: 0
      end: 0
      duration: 0
    tests = []
    emitter = new EventEmitter
    #baseReporter = new BaseReporter(emitter, stats, tests)
    
    process.env['DREDD_REST_URL'] = "https://api.apiary.io"
    process.env['DREDD_REST_TOKEN'] = "aff888af9993db9ef70edf3c878ab521"
    process.env['DREDD_REST_SUITE'] = "jakubtest"
    test =
      status: "fail"
      title: "POST /machines"
      message: "headers: Value of the ‘content-type’ must be application/json.\nbody: No validator found for real data media type 'text/plain' and expected data media type 'application/json'.\nstatusCode: Real and expected data does not match.\n"
      actual:
        statusCode: 400
        headers:
          "content-type": "text/plain"

        body: "Foo bar"

      expected:
        headers:
          "content-type": "application/json"

        body: "{\n  \"type\": \"bulldozer\",\n  \"name\": \"willy\",\n  \"id\": \"5229c6e8e4b0bd7dbb07e29c\"\n}\n"
        status: "202"

      request:
        body: "{\n  \"type\": \"bulldozer\",\n  \"name\": \"willy\"}\n"
        headers:
          "Content-Type": "application/json"
          "User-Agent": "Dredd/0.2.1 (Darwin 13.0.0; x64)"
          "Content-Length": 44

        uri: "/machines"
        method: "POST"

      results:
        headers:
          results: [
            pointer: "/content-type"
            severity: "error"
            message: "Value of the ‘content-type’ must be application/json."
          ]
          realType: "application/vnd.apiary.http-headers+json"
          expectedType: "application/vnd.apiary.http-headers+json"
          validator: "HeadersJsonExample"
          rawData:
            0:
              property: ["content-type"]
              propertyValue: "text/plain"
              attributeName: "enum"
              attributeValue: ["application/json"]
              message: "Value of the ‘content-type’ must be application/json."
              validator: "enum"
              validatorName: "enum"
              validatorValue: ["application/json"]

            length: 1

        body:
          results: [
            message: "No validator found for real data media type 'text/plain' and expected data media type 'application/json'."
            severity: "error"
          ]
          realType: "text/plain"
          expectedType: "application/json"
          validator: null
          rawData: null

        statusCode:
          realType: "text/vnd.apiary.status-code"
          expectedType: "text/vnd.apiary.status-code"
          validator: "TextDiff"
          rawData: "@@ -1,3 +1,9 @@\n-400\n+undefined\n"
          results: [
            severity: "error"
            message: "Real and expected data does not match."
          ]

    nock.disableNetConnect()
    done()

  afterEach (done) ->
    nock.enableNetConnect()
    nock.cleanAll()
    done()

  describe 'when starting', () ->
    call = null    
    runId = '507f1f77bcf86cd799439011'
    
    beforeEach () ->
      uri = '/apis/' + process.env['DREDD_REST_SUITE'] + '/tests/runs'
      call = nock(process.env['DREDD_REST_URL']).
        post(uri).
        matchHeader('Authentication', 'Token ' + process.env['DREDD_REST_TOKEN']).
        reply(201, {"_id": runId})

    it 'should set uuid', (done) ->
      emitter = new EventEmitter
      apiaryReporter = new ApiaryReporter emitter, {}, {}
      emitter.emit 'start', "blueprint data", () ->
        assert.isNotNull apiaryReporter.uuid
        done()
    
    it 'should set start time', (done) ->
      emitter = new EventEmitter
      apiaryReporter = new ApiaryReporter emitter, {}, {}
      emitter.emit 'start', "blueprint data", () ->
        assert.isNotNull apiaryReporter.startedAt
        done()
    
    it 'should call "create new test run" HTTP resource', (done ) ->
      emitter = new EventEmitter
      apiaryReporter = new ApiaryReporter emitter, {}, {}
      emitter.emit 'start', "blueprint data", () ->
        assert.isTrue call.isDone()
        done()

    it 'should attach test run ID back to the reporter as remoteId', (done) ->
      emitter = new EventEmitter
      apiaryReporter = new ApiaryReporter emitter, {}, {}
      emitter.emit 'start', "blueprint data", () ->
        assert.isNotNull apiaryReporter.remoteId      
        done()
  
  describe 'when adding passing test', () ->
    call = null    
    runId = '507f1f77bcf86cd799439011'
    test = null

    beforeEach () ->
      uri = '/apis/' + process.env['DREDD_REST_SUITE'] + '/tests/steps?testRunId=' + runId
      call = nock(process.env['DREDD_REST_URL']).
        post(uri).
        matchHeader('Authentication', 'Token ' + process.env['DREDD_REST_TOKEN']).
        reply(201, {"_id": runId})

    it 'should call "create new test step" HTTP resource', () ->
      emitter = new EventEmitter
      apiaryReporter = new ApiaryReporter emitter, {}, {}
      apiaryReporter.remoteId = runId
      emitter.emit 'test pass', test
      assert.isTrue call.isDone()      

  describe 'when adding failing test', () ->
    call = null    
    runId = '507f1f77bcf86cd799439011'
    test = null

    beforeEach () ->
      uri = '/apis/' + process.env['DREDD_REST_SUITE'] + '/tests/steps?testRunId=' + runId
      call = nock(process.env['DREDD_REST_URL']).
        post(uri).
        matchHeader('Authentication', 'Token ' + process.env['DREDD_REST_TOKEN']).
        reply(201, {"_id": runId})

    it 'should call "create new test step" HTTP resource', () ->
      emitter = new EventEmitter
      apiaryReporter = new ApiaryReporter emitter, {}, {}
      apiaryReporter.remoteId = runId
      emitter.emit 'test fail', test
      assert.isTrue call.isDone()  


  describe 'when ending', () ->
    call = null    
    runId = '507f1f77bcf86cd799439011'

    beforeEach () ->
      uri = '/apis/' + process.env['DREDD_REST_SUITE'] + '/tests/run/' + runId
      call = nock(process.env['DREDD_REST_URL']).
        patch(uri).
        matchHeader('Authentication', 'Token ' + process.env['DREDD_REST_TOKEN']).
        reply(201, {"_id": runId})

    it 'should update "test run" resource with result data', (done) ->
      emitter = new EventEmitter
      apiaryReporter = new ApiaryReporter emitter, {}, {}
      apiaryReporter.remoteId = runId
      emitter.emit 'end', () ->
        assert.isTrue call.isDone()
        done()





