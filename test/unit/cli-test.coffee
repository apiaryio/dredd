{assert} = require 'chai'
sinon = require 'sinon'
proxyquire = require('proxyquire').noCallThru()

fsStub = require 'fs'
protagonistStub = require 'protagonist'
cliUtilsStub = require '../../src/cli-utils'

executeTransaction = (transaction, callback) ->
  callback()

executeTransactionStub = sinon.spy executeTransaction

blueprintAstToRuntime = require '../../src/blueprint-ast-to-runtime'
blueprintAstToRuntimeStub = sinon.spy blueprintAstToRuntime

cli = proxyquire '../../src/cli', {
  'protagonist': protagonistStub
  './cli-utils': cliUtilsStub
  './blueprint-ast-to-runtime': blueprintAstToRuntimeStub
  './execute-transaction': executeTransactionStub
  'fs': fsStub
}

describe 'cli()', () ->
  
  configuration = {}

  beforeEach () ->
    sinon.spy protagonistStub, 'parse'
    sinon.stub cliUtilsStub, 'exit'
    sinon.stub cliUtilsStub, 'log'
    sinon.stub cliUtilsStub, 'error'
    sinon.spy fsStub, 'readFile'


  afterEach () -> 
    protagonistStub.parse.restore()
    cliUtilsStub.exit.restore()
    cliUtilsStub.log.restore()
    cliUtilsStub.error.restore()    
    fsStub.readFile.restore()
  
  describe 'with valid configuration', () ->  
    before () ->
      configuration =
        blueprintPath: './test/fixtures/apiary.apib'
        server: 'http://localhost:3000/'

    it 'should load the file on given path', (done) ->
      cli configuration, () ->
        assert.ok fsStub.readFile.calledWith configuration['blueprintPath']
        done()

    it 'should parse blueprint to ast', (done) ->
      cli configuration, () ->
        assert.ok protagonistStub.parse.called
        done()

    it 'should exit with status 0', (done) ->
      cli configuration, () ->
        assert.ok cliUtilsStub.exit.calledWith(0)
        done()

    it 'should convert ast to runtime', (done) ->
      cli configuration, () ->
        assert.ok blueprintAstToRuntimeStub.called
        done()
    
  describe 'when Blueprint parsing error', () ->
    beforeEach () ->
      executeTransactionStub.reset()

    before () ->
      configuration =
        blueprintPath: './test/fixtures/error-blueprint.apib'
        url: 'http://localhost:3000/'

    it 'should exit with status 1', (done) ->
      cli configuration, () ->
        assert.ok cliUtilsStub.exit.calledWith(1)
        done()

    it 'should return error to stdout'
    
    it 'should NOT execute tany transaction', (done) ->
      cli configuration, () ->
        assert.notOk executeTransactionStub.called
        done()
  
  describe 'when Blueprint parsing warning', () ->
    it 'should execute the runtime'
    
    it 'should exit with status 0', () ->

  describe 'when non existing Blueprint path', () ->
    beforeEach () ->
      executeTransactionStub.reset()
    
    before () ->
      configuration =
        blueprintPath: './balony/path.apib'
        url: 'http://localhost:3000/'

    it 'should exit with status 1', (done) ->
      cli configuration, () ->
        assert.ok cliUtilsStub.exit.calledWith(1)
        done()
    
    it 'should NOT execute any transaction', (done) ->
      cli configuration, () ->
        assert.notOk executeTransactionStub.called
        done()
    
    it 'should return error to stdout'

  describe 'when runtime contains any error', () ->
    before () ->
      configuration =
        blueprintPath: './test/fixtures/error-uri-template.apib'
        server: 'http://localhost:3000/'      
      
      executeTransactionStub.reset()       
    
    it 'should NOT execute any transaction', (done) ->     
      cli configuration, () ->
        assert.notOk executeTransactionStub.called
        done()  

    it 'should print runtime errors to stdout'
    
    it 'should exit with status 1', (done) ->
       cli configuration, () ->
        assert.ok cliUtilsStub.exit.calledWith(1)
        done()     
  
  describe 'when runtime contains any warning', () ->
    before () ->
      configuration =
        blueprintPath: './test/fixtures/warning-ambigous.apib'
        server: 'http://localhost:3000/'      
      
      executeTransactionStub.reset()

    it 'should execute some transaction', (done) ->     
      cli configuration, () ->
        assert.ok executeTransactionStub.called
        done()  

    it 'should print runtime warnings to stdout'
    
    it 'should not exit', (done) ->
       cli configuration, () ->
        assert.ok cliUtilsStub.exit.calledWith(0)
        done()     

  describe 'when runtime is without errors and warnings', () ->
    beforeEach () ->
      executeTransactionStub.reset()

    it 'should execute the runtime', (done) ->
      cli configuration, () ->
        assert.ok blueprintAstToRuntimeStub.called
        done()      
      

  
