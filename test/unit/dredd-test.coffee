{assert} = require 'chai'
sinon = require 'sinon'
proxyquire = require('proxyquire').noCallThru()

fsStub = require 'fs'
protagonistStub = require 'protagonist'
loggerStub = require '../../src/logger'

blueprintAstToRuntime = require '../../src/blueprint-ast-to-runtime'
blueprintAstToRuntimeStub = sinon.spy blueprintAstToRuntime

Dredd = proxyquire '../../src/dredd', {
  'protagonist': protagonistStub
  './blueprint-ast-to-runtime': blueprintAstToRuntimeStub
  'fs': fsStub
  './logger': loggerStub
}

describe 'Dredd class', () ->

  configuration = {}
  dredd = {}

  beforeEach () ->
    sinon.spy protagonistStub, 'parse'
    sinon.spy fsStub, 'readFile'

  afterEach () ->
    protagonistStub.parse.restore()
    fsStub.readFile.restore()

  describe 'with valid configuration', () ->
    before () ->
      configuration =
        server: 'http://localhost:3000/'
        options:
          silent: true
          method: 'get'
          header: 'Accept:application/json'
          user: 'bob:test'
          sorted: true
          path: ['./test/fixtures/apiary.apib']

    it 'should copy configuration on creation', () ->
      dredd = new Dredd(configuration)
      assert.ok(dredd.configuration.options.silent)
      assert.notOk(dredd.configuration.options['dry-run'])

    it 'should load the file on given path', (done) ->
      dredd = new Dredd(configuration)
      sinon.stub dredd.runner, 'executeTransaction', (transaction, callback) ->
        callback()
      dredd.run (error) ->
        assert.ok fsStub.readFile.calledWith configuration.options.path[0]
        dredd.runner.executeTransaction.restore()
        done()

    it 'should parse blueprint to ast', (done) ->
      dredd = new Dredd(configuration)
      sinon.stub dredd.runner, 'executeTransaction', (transaction, callback) ->
        callback()
      dredd.run (error) ->
        assert.ok protagonistStub.parse.called
        dredd.runner.executeTransaction.restore()
        done()

    it 'should not pass any error to the callback function', (done) ->
      dredd = new Dredd(configuration)
      sinon.stub dredd.runner, 'executeTransaction', (transaction, callback) ->
        callback()
      dredd.run (error) ->
        assert.isNull(error)
        dredd.runner.executeTransaction.restore()
        done()

    it 'should pass the reporter as second argument', (done) ->
      dredd = new Dredd(configuration)
      sinon.stub dredd.runner, 'executeTransaction', (transaction, callback) ->
        callback()
      dredd.run (error, reporter) ->
        assert.isDefined reporter
        dredd.runner.executeTransaction.restore()
        done()

    it 'should convert ast to runtime', (done) ->
      dredd = new Dredd(configuration)
      sinon.stub dredd.runner, 'executeTransaction', (transaction, callback) ->
        callback()
      dredd.run (error) ->
        assert.ok blueprintAstToRuntimeStub.called
        dredd.runner.executeTransaction.restore()
        done()

    describe 'when paths specified with glob paterns', () ->
      before () ->
        configuration =
          server: 'http://localhost:3000/'
          options:
            silent: true
            path: ['./test/fixtures/multifile/*.apib', './test/fixtures/multifile/*.apib' ,'./test/fixtures/multifile/*.balony']
        dredd = new Dredd(configuration)

      beforeEach () ->
        sinon.stub dredd.runner, 'executeTransaction', (transaction, callback) ->
          callback()

      afterEach () ->
        dredd.runner.executeTransaction.restore()

      it 'should expand all glob patterns and resolved paths should be unique', (done) ->
        dredd.run (error) ->
          return done error if error
          assert.equal dredd.configuration.files.length, 3
          assert.include dredd.configuration.files, './test/fixtures/multifile/message.apib'
          done()

      it 'should remove globs from config', (done) ->
        dredd.run (error) ->
          return done error if error
          assert.notInclude dredd.configuration.files, './test/fixtures/multifile/*.apib'
          assert.notInclude dredd.configuration.files, './test/fixtures/multifile/*.balony'
          done()

      it 'should load file contents on paths to config', (done) ->
        dredd.run (error) ->
          return done error if error
          assert.isObject dredd.configuration.data
          assert.property dredd.configuration.data, './test/fixtures/multifile/greeting.apib'
          assert.isObject dredd.configuration.data['./test/fixtures/multifile/greeting.apib']
          assert.property dredd.configuration.data['./test/fixtures/multifile/greeting.apib'], 'raw'
          done()

      it 'should parse loaded files', (done) ->
        dredd.run (error) ->
          return done error if error
          assert.property dredd.configuration.data['./test/fixtures/multifile/greeting.apib'], 'parsed'
          done()


    describe 'when glob pattern does not match any files', () ->
      before () ->
        configuration =
          server: 'http://localhost:3000/'
          options:
            silent: true
            path: ['./test/fixtures/multifile/*.balony']
        dredd = new Dredd(configuration)

      beforeEach () ->
        sinon.stub dredd.runner, 'executeTransaction', (transaction, callback) ->
          callback()

      afterEach () ->
        dredd.runner.executeTransaction.restore()

      it 'should return error', (done) ->
        dredd.run (error) ->
          assert.ok error
          done()

  describe 'when Blueprint parsing error', () ->

    before () ->
      configuration =
        url: 'http://localhost:3000/'
        options:
          silent: true
          path: ['./test/fixtures/error-blueprint.apib']
      dredd = new Dredd(configuration)

    beforeEach () ->
      sinon.stub dredd.runner, 'executeTransaction', (transaction, callback) ->
        callback()

    afterEach () ->
      dredd.runner.executeTransaction.restore()

    it 'should exit with an error', (done) ->
      dredd.run (error) ->
        assert.ok error
        done()

    it 'should NOT execute any transaction', (done) ->
      dredd.run () ->
        assert.notOk dredd.runner.executeTransaction.called
        done()

  describe 'when Blueprint parsing warning', () ->

    before () ->
      configuration =
        url: 'http://localhost:3000/'
        options:
          silent: true
          path: ['./test/fixtures/warning-ambigous.apib']
      dredd = new Dredd(configuration)

    beforeEach () ->
      sinon.stub dredd.runner, 'run', (transaction, callback) ->
        callback()
      sinon.spy loggerStub, 'warn'

    afterEach () ->
      dredd.runner.run.restore()
      loggerStub.warn.restore()

    it 'should execute the runtime', (done) ->
      dredd.run () ->
        assert.ok dredd.runner.run.called
        done()

    it 'should write warnings to warn logger', (done) ->
      dredd.run () ->
        assert.ok loggerStub.warn.called
        done()


  describe 'when non existing Blueprint path', () ->

    beforeEach () ->
      configuration =
        url: 'http://localhost:3000/'
        options:
          silent: true
          path: ['./balony/path.apib']
      dredd = new Dredd(configuration)
      sinon.stub dredd.runner, 'executeTransaction', (transaction, callback) ->
        callback()

    afterEach () ->
      dredd.runner.executeTransaction.reset()

    it 'should pass the error to the callback function', (done) ->
      dredd.run (error) ->
        assert.ok error
        done()

    it 'should NOT execute any transaction', (done) ->
      dredd.run (error) ->
        assert.notOk dredd.runner.executeTransaction.called
        done()

  describe 'when runtime contains any error', () ->
    beforeEach () ->
      configuration =
        server: 'http://localhost:3000/'
        options:
          silent: true
          path: ['./test/fixtures/error-uri-template.apib']

      dredd = new Dredd(configuration)
      sinon.stub dredd.runner, 'executeTransaction', (transaction, callback) ->
        callback()

    afterEach () ->
      dredd.runner.executeTransaction.reset()

    it 'should NOT execute any transaction', (done) ->
      dredd.run (error) ->
        assert.notOk dredd.runner.executeTransaction.called
        done()

    it 'should exit with an error', (done) ->
      dredd.run (error) ->
        assert.ok error
        done()

  describe 'when runtime contains any warning', () ->

    beforeEach () ->
      configuration =
        server: 'http://localhost:3000/'
        options:
          silent: true
          path: ['./test/fixtures/warning-ambigous.apib']
      sinon.spy loggerStub, 'warn'
      dredd = new Dredd(configuration)
      sinon.stub dredd.runner, 'executeTransaction', (transaction, callback) ->
        callback()

    afterEach () ->
      dredd.runner.executeTransaction.reset()
      loggerStub.warn.restore()

    it 'should execute some transaction', (done) ->
      dredd.run (error) ->
        assert.ok dredd.runner.executeTransaction.called
        done()

    it 'should print runtime warnings to stdout', (done) ->
      dredd.run (error) ->
        assert.ok loggerStub.warn.called
        done()

    it 'should not exit', (done) ->
      dredd.run (error) ->
        assert.notOk error
        done()

  describe 'when runtime is without errors and warnings', () ->
    beforeEach () ->
      configuration =
        server: 'http://localhost:3000/'
        options:
          silent: true
          path: ['./test/fixtures/warning-ambigous.apib']
      dredd = new Dredd(configuration)
      sinon.stub dredd.runner, 'executeTransaction', (transaction, callback) ->
        callback()

    afterEach () ->
      dredd.runner.executeTransaction.reset()

    it 'should execute the runtime', (done) ->
      dredd.run (error) ->
        assert.ok blueprintAstToRuntimeStub.called
        done()



