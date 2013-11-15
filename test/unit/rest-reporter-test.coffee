{assert} = require 'chai'
sinon = require 'sinon'
nock = require 'nock'
RestReporter = require '../../src/rest-reporter'


describe 'RestReporter', () ->

  beforeEach (done) ->
    nock.disableNetConnect()
    done()

  afterEach (done) ->
    nock.enableNetConnect()
    nock.cleanAll()
    done()

  test = {}
  reporter = null
  
  opts = 
    apiUrl: 'http://apiary.dev:8001/'
    suite: 'jakubtest'
    apiToken: 'aff888af9993db9ef70edf3c878ab521' 
  
  conf = 
    options:
      restReporter: opts

  describe 'when starting', () ->
    call = null
    
    runId = '507f1f77bcf86cd799439011'

    beforeEach () ->
      uri = '/apis/' + opts['suite'] + '/tests/runs'
      call = nock(opts['apiUrl']).
        post(uri).
        matchHeader('Authentication', 'Token ' + opts['apiToken']).
        reply(201, {"_id": runId})
    
      reporter = new RestReporter conf

    it 'should call "create new test run" HTTP resource', (done) ->
      reporter.start rawBlueprint: 'blueprint body', (err) ->
        done(err) if err
        assert.isTrue call.isDone()
        done()

    it 'should attach test run ID back to the reporter as remoteId', (done) ->
      reporter.start rawBlueprint: 'blueprint body', (err) ->
        done err if err 
        assert.equal reporter.remoteId, runId
        done()

    it 'request body should have proper strucutre according to the API Blueprint'

  describe 'when adding test', () ->
    
    call = null

    stepId = '507c7f79bcf86cd7994f6c0e'    
    runId = '507f1f77bcf86cd799439011'

    beforeEach () ->
      uri = '/apis/' + opts['suite'] + '/tests/steps?testRunId=' + runId
      
      call = nock(opts['apiUrl']).
        post(uri).
        matchHeader('Authentication', 'Token ' + opts['apiToken']).
        matchHeader('Content-Type', 'application/json').
        reply(201, {"_id": stepId })

      reporter = new RestReporter conf      
      reporter.remoteId = runId
      
      # TODO test with full strucutre
      # see: 
      # https://gist.github.com/netmilk/20fde1c26a7cd0e0be20/raw/e1a59f42998d409bb8745c424a7d3294c6fa5e18/dredd_faulty_resource_bad_mody.md
      # 

      test =
        status: 'pass'
        title: 'Passing Test'

    it 'should call "create new test step" HTTP resource', (done) ->
      reporter.addTest test, (err) ->
        done err if err
        assert.isTrue call.isDone()
        done()
    
    it 'request body should have proper structure according to the API Blueprint'
    
    it 'should attach test step ID back to the reporter as remoteId', (done) ->
      reporter.addTest test, (err) ->
        done err if err
        ids = []
        
        for test in reporter.tests
          ids.push test['remoteId']

        assert.include ids, stepId

        done()
    

  describe 'when creating report', () ->
    
    call = null

    runId = '507f1f77bcf86cd799439011'

    beforeEach () ->
      uri = '/apis/' + opts['suite'] + '/tests/run/' + runId
      
      call = nock(opts['apiUrl']).
        patch(uri).
        matchHeader('Authentication', 'Token ' + opts['apiToken']).
        reply(200, {} )
  
      reporter = new RestReporter conf      
      reporter.remoteId = runId
      reporter.stats =
        tests: 0
        failures: 0
        passes: 0
        timestamp: (new Date).toUTCString()
        duration: 1234
      
    it 'should update "test run" resource with result data', (done) ->
      reporter.createReport (err) ->
        done err if err
        assert.isTrue call.isDone()
        done()

    it 'request body should have proper structure according to the API Blueprint'








