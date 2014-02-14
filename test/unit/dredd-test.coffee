{assert} = require 'chai'
sinon = require 'sinon'
proxyquire = require('proxyquire').noCallThru()

fsStub = require 'fs'
protagonistStub = require 'protagonist'
loggerStub = require '../../src/logger'

executeTransaction = (transaction, callback) ->
  callback()

executeTransactionStub = sinon.spy executeTransaction

blueprintAstToRuntime = require '../../src/blueprint-ast-to-runtime'
blueprintAstToRuntimeStub = sinon.spy blueprintAstToRuntime

Dredd = proxyquire '../../src/dredd', {
  'protagonist': protagonistStub
  './blueprint-ast-to-runtime': blueprintAstToRuntimeStub
  './execute-transaction': executeTransactionStub
  'fs': fsStub
  './logger': loggerStub
}

describe 'Dredd class', () ->

  configuration = {}

  beforeEach () ->
    sinon.spy protagonistStub, 'parse'
    sinon.spy fsStub, 'readFile'

  afterEach () ->
    protagonistStub.parse.restore()
    fsStub.readFile.restore()

  describe 'with valid configuration', () ->
    before () ->
      configuration =
        blueprintPath: './test/fixtures/apiary.apib'
        server: 'http://localhost:3000/'
        options:
          silent: true
          method: 'get'
          header: 'Accept:application/json'
          user: 'bob:test'
          sorted: true

    it 'should copy configuration on creation', () ->
      runner = new Dredd(configuration)
      assert.ok(runner.configuration.options.silent)
      assert.notOk(runner.configuration.options['dry-run'])

    it 'should call start on the reporter', () ->
      

    it 'should load the file on given path', (done) ->
      runner = new Dredd(configuration)
      runner.run (error) ->
        assert.ok fsStub.readFile.calledWith configuration['blueprintPath']
        done()

    it 'should parse blueprint to ast', (done) ->
      runner = new Dredd(configuration)
      runner.run (error) ->
        assert.ok protagonistStub.parse.called
        done()

    it 'should not pass any error to the callback function', (done) ->
      runner = new Dredd(configuration)
      runner.run (error) ->
        assert.isNull(error)
        done()

    it 'should pass the reporter as second argument', (done) ->
      runner = new Dredd(configuration)
      runner.run (error, reporter) ->
        assert.isDefined reporter
        done()
    
    it 'should convert ast to runtime', (done) ->
      runner = new Dredd(configuration)
      runner.run (error) ->
        assert.ok blueprintAstToRuntimeStub.called
        done()

  describe 'when Blueprint parsing error', () ->
    beforeEach () ->
      executeTransactionStub.reset()

    before () ->
      configuration =
        blueprintPath: './test/fixtures/error-blueprint.apib'
        url: 'http://localhost:3000/'
        options:
          silent: true
    
    it 'should report via reporter'

    it 'should exit with an error', (done) ->
      runner = new Dredd(configuration)
      runner.run (error) ->
        assert.ok error
        done()


    it 'should NOT execute any transaction', (done) ->
      runner = new Dredd(configuration)
      runner.run () ->
        assert.notOk executeTransactionStub.called
        done()

  describe 'when Blueprint parsing warning', () ->

    beforeEach () ->
      executeTransactionStub.reset()

    before () ->
      configuration =
        blueprintPath: './test/fixtures/warning-ambigous.apib'
        url: 'http://localhost:3000/'
        options:
          silent: true

    it 'should execute the runtime', (done) ->
      runner = new Dredd(configuration)
      runner.run () ->
        assert.ok executeTransactionStub.called
        done()

  describe 'when non existing Blueprint path', () ->
    beforeEach () ->
      executeTransactionStub.reset()

    before () ->
      configuration =
        blueprintPath: './balony/path.apib'
        url: 'http://localhost:3000/'
        options:
          silent: true
    
    it 'should report via reporter'

    it 'should pass the error to the callback function', (done) ->
      runner = new Dredd(configuration)
      runner.run (error) ->
        assert.ok error
        done()

    it 'should NOT execute any transaction', (done) ->
      runner = new Dredd(configuration)
      runner.run (error) ->
        assert.notOk executeTransactionStub.called
        done()

  describe 'when runtime contains any error', () ->
    before () ->
      configuration =
        blueprintPath: './test/fixtures/error-uri-template.apib'
        server: 'http://localhost:3000/'
        options:
          silent: true
      executeTransactionStub.reset()

    it 'should report via reporter'

    it 'should NOT execute any transaction', (done) ->
      runner = new Dredd(configuration)
      runner.run (error) ->
        assert.notOk executeTransactionStub.called
        done()

    it 'should exit with an error', (done) ->
      runner = new Dredd(configuration)
      runner.run (error) ->
        assert.ok error
        done()

  describe 'when runtime contains any warning', () ->
    before () ->
      configuration =
        blueprintPath: './test/fixtures/warning-ambigous.apib'
        server: 'http://localhost:3000/'
        options:
          silent: true

      executeTransactionStub.reset()

    beforeEach () ->
      sinon.spy loggerStub, 'warn'

    afterEach () ->
      loggerStub.warn.restore()

    it 'should execute some transaction', (done) ->
      runner = new Dredd(configuration)
      runner.run (error) ->
        assert.ok executeTransactionStub.called
        done()

    it 'should print runtime warnings to stdout', (done) ->
      runner = new Dredd(configuration)
      runner.run (error) ->
        assert.ok loggerStub.warn.called
        done()

    it 'should not exit', (done) ->
      runner = new Dredd(configuration)
      runner.run (error) ->
        assert.notOk error
        done()

  describe 'when runtime is without errors and warnings', () ->
    beforeEach () ->
      executeTransactionStub.reset()
    
    it 'should execute the runtime', (done) ->
      runner = new Dredd(configuration)
      runner.run (error) ->
        assert.ok blueprintAstToRuntimeStub.called
        done()



