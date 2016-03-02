{assert} = require 'chai'
sinon = require 'sinon'
proxyquire = require('proxyquire').noCallThru()
bodyParser = require 'body-parser'
express = require 'express'

fsStub = require 'fs'
ProtagonistStub = require 'protagonist'
requestStub = require 'request'
loggerStub = require '../../src/logger'

blueprintTransactionsStub = require 'blueprint-transactions'

Dredd = proxyquire '../../src/dredd', {
  'protagonist': ProtagonistStub
  'request': requestStub
  'blueprint-transactions': blueprintTransactionsStub
  'fs': fsStub
  './logger': loggerStub
}

describe 'Dredd class', () ->

  configuration = {}
  dredd = {}

  beforeEach () ->
    sinon.spy ProtagonistStub, 'parse'
    sinon.spy fsStub, 'readFile'

  afterEach () ->
    ProtagonistStub.parse.restore()
    fsStub.readFile.restore()

  describe 'with legacy configuration', () ->
    before () ->
      configuration =
        server: 'http://localhost:3000/'
        blueprintPath: './test/fixtures/apiary.apib'
       sinon.stub loggerStub, 'info', ->
       sinon.stub loggerStub, 'log', ->

    after ->
      loggerStub.info.restore()
      loggerStub.log.restore()

    it 'should not explode and run executeTransaction', (done) ->

      fn = () ->
        dredd = new Dredd(configuration)
        sinon.stub dredd.runner, 'executeTransaction', (transaction, hooks, callback) ->
          callback()
        dredd.run (error) ->
          assert.ok dredd.runner.executeTransaction.called
          dredd.runner.executeTransaction.restore()
          done()

      assert.doesNotThrow fn

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
      sinon.stub dredd.runner, 'executeTransaction', (transaction, hooks, callback) ->
        callback()
      dredd.run (error) ->
        assert.ok fsStub.readFile.calledWith configuration.options.path[0]
        dredd.runner.executeTransaction.restore()
        done()

    it 'should parse blueprint to ast', (done) ->
      dredd = new Dredd(configuration)
      sinon.stub dredd.runner, 'executeTransaction', (transaction, hooks, callback) ->
        callback()
      dredd.run (error) ->
        assert.ok ProtagonistStub.parse.called
        dredd.runner.executeTransaction.restore()
        done()

    it 'should not pass any error to the callback function', (done) ->
      dredd = new Dredd(configuration)
      sinon.stub dredd.runner, 'executeTransaction', (transaction, hooks, callback) ->
        callback()
      dredd.run (error) ->
        assert.isNull(error)
        dredd.runner.executeTransaction.restore()
        done()

    it 'should pass the reporter as second argument', (done) ->
      dredd = new Dredd(configuration)
      sinon.stub dredd.runner, 'executeTransaction', (transaction, hooks, callback) ->
        callback()
      dredd.run (error, reporter) ->
        assert.isDefined reporter
        dredd.runner.executeTransaction.restore()
        done()

    it 'should convert ast to runtime', (done) ->
      sinon.spy blueprintTransactionsStub, 'compile'
      dredd = new Dredd(configuration)
      sinon.stub dredd.runner, 'executeTransaction', (transaction, hooks, callback) ->
        callback()
      dredd.run (error) ->
        assert.ok blueprintTransactionsStub.compile.called
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
        sinon.stub dredd.runner, 'executeTransaction', (transaction, hooks, callback) ->
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
          assert.property dredd.configuration.data['./test/fixtures/multifile/greeting.apib'], 'filename'
          assert.property dredd.configuration.data['./test/fixtures/multifile/greeting.apib'], 'raw'
          done()

      it 'should parse loaded files', (done) ->
        dredd.run (error) ->
          return done error if error
          assert.isObject dredd.configuration.data['./test/fixtures/multifile/greeting.apib']
          assert.property dredd.configuration.data['./test/fixtures/multifile/greeting.apib'], 'parsed'
          assert.property dredd.configuration.data['./test/fixtures/multifile/greeting.apib'], 'filename'
          assert.property dredd.configuration.data['./test/fixtures/multifile/greeting.apib'], 'raw'
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
        sinon.stub dredd.runner, 'executeTransaction', (transaction, hooks, callback) ->
          callback()

      afterEach () ->
        dredd.runner.executeTransaction.restore()

      it 'should return error', (done) ->
        dredd.run (error) ->
          assert.ok error
          done()


    describe 'when configuration contains data object with "filename" as key, and an API Blueprint string as value', () ->
      beforeEach ->
        configuration =
          server: 'http://localhost:3000/'
          options:
            silent: true
          data:
            testingDirectObject:
              filename: 'testingDirectObjectFilename'
              raw: """
                # API name

                GET /url
                + Response 200 (application/json)

                        {"a":"b"}'
                """
            testingDirectBlueprintString: """
              # API name

              GET /url
              + Response 200 (application/json)

                      {"a":"b"}'
              """
        dredd = new Dredd(configuration)
        sinon.stub dredd.runner, 'executeTransaction', (transaction, hooks, callback) ->
          callback()

      afterEach () ->
        dredd.runner.executeTransaction.restore()

      it 'should not expand any glob patterns', (done) ->
        dredd.run (error) ->
          return done error if error
          assert.lengthOf dredd.configuration.files, 0
          done()

      it 'should pass data contents to config', (done) ->
        dredd.run (error) ->
          return done error if error
          assert.isObject dredd.configuration.data
          assert.notDeepProperty dredd, 'configuration.data.testingDirectObject'
          assert.deepPropertyVal dredd, 'configuration.data.testingDirectObjectFilename.filename', 'testingDirectObjectFilename'
          assert.deepProperty    dredd, 'configuration.data.testingDirectObjectFilename.raw'
          assert.deepPropertyVal dredd, 'configuration.data.testingDirectBlueprintString.filename', 'testingDirectBlueprintString'
          assert.deepProperty    dredd, 'configuration.data.testingDirectBlueprintString.raw'
          done()

      it 'should parse passed data contents', (done) ->
        dredd.run (error) ->
          return done error if error
          assert.deepProperty dredd, 'configuration.data.testingDirectObjectFilename.parsed'
          assert.deepProperty dredd, 'configuration.data.testingDirectBlueprintString.parsed'
          done()

      describe 'and I also set configuration.options.path to an existing file', ->
        localdredd = null
        beforeEach ->
          configuration.options ?= {}
          configuration.options.path = ['./test/fixtures/apiary.apib']
          localdredd = new Dredd(configuration)
          sinon.stub localdredd.runner, 'executeTransaction', (transaction, hooks, callback) ->
            callback()

        afterEach ->
          localdredd.runner.executeTransaction.restore()

        it 'should fill configuration data with data and one file at that path', (done) ->
          localdredd.run (error) ->
            return done error if error
            assert.lengthOf    localdredd.configuration.files, 1
            assert.isObject    localdredd.configuration.data
            assert.lengthOf    Object.keys(localdredd.configuration.data), 3
            assert.property    localdredd.configuration.data, './test/fixtures/apiary.apib'
            assert.propertyVal localdredd.configuration.data['./test/fixtures/apiary.apib'], 'filename', './test/fixtures/apiary.apib'
            assert.property    localdredd.configuration.data['./test/fixtures/apiary.apib'], 'raw'
            assert.property    localdredd.configuration.data['./test/fixtures/apiary.apib'], 'parsed'
            assert.deepPropertyVal localdredd, 'configuration.data.testingDirectObjectFilename.filename', 'testingDirectObjectFilename'
            assert.deepProperty    localdredd, 'configuration.data.testingDirectObjectFilename.raw'
            assert.deepProperty    localdredd, 'configuration.data.testingDirectObjectFilename.parsed'
            assert.deepPropertyVal localdredd, 'configuration.data.testingDirectBlueprintString.filename', 'testingDirectBlueprintString'
            assert.deepProperty    localdredd, 'configuration.data.testingDirectBlueprintString.raw'
            assert.deepProperty    localdredd, 'configuration.data.testingDirectBlueprintString.parsed'
            done()


    describe 'when paths are specified as a mix of URLs and a glob path', () ->
      blueprintCode = null
      before (done) ->
        configuration =
          server: 'http://localhost:3000/'
          options:
            silent: true
            path: ['http://some.path.to/file.apib', 'https://another.path.to/apiary.apib', './test/fixtures/multifile/*.apib']
        dredd = new Dredd(configuration)
        fsStub.readFile './test/fixtures/single-get.apib', 'utf8', (err, content) ->
          blueprintCode = content.toString()
          done err

      beforeEach () ->
        sinon.stub dredd.runner, 'executeTransaction', (transaction, hooks, callback) ->
          callback()

      afterEach () ->
        dredd.runner.executeTransaction.restore()

      describe 'when all URLs can be downloaded', ->
        before ->
          sinon.stub requestStub, 'get', (receivedArgs = {}, cb) ->
            cb null, {statusCode:200}, blueprintCode

        after ->
          requestStub.get.restore()

        it 'should expand glob pattern and resolved paths should be unique', (done) ->
          dredd.run (error) ->
            return done error if error
            assert.lengthOf dredd.configuration.files, 5
            assert.sameMembers dredd.configuration.files, [
              'http://some.path.to/file.apib'
              'https://another.path.to/apiary.apib'
              './test/fixtures/multifile/message.apib'
              './test/fixtures/multifile/greeting.apib'
              './test/fixtures/multifile/name.apib'
            ]
            done()

        it 'should remove globs from config', (done) ->
          dredd.run (error) ->
            return done error if error
            assert.notInclude dredd.configuration.files, './test/fixtures/multifile/*.apib'
            done()

        it 'should load file contents on paths to config and parse these files', (done) ->
          dredd.run (error) ->
            return done error if error
            assert.isObject dredd.configuration.data
            assert.property dredd.configuration.data, './test/fixtures/multifile/greeting.apib'
            assert.property dredd.configuration.data, 'http://some.path.to/file.apib'
            assert.property dredd.configuration.data, 'https://another.path.to/apiary.apib'

            assert.isObject dredd.configuration.data['./test/fixtures/multifile/name.apib']
            assert.property dredd.configuration.data['./test/fixtures/multifile/name.apib'], 'filename'
            assert.property dredd.configuration.data['./test/fixtures/multifile/name.apib'], 'raw'
            assert.property dredd.configuration.data['./test/fixtures/multifile/name.apib'], 'parsed'

            assert.isObject dredd.configuration.data['./test/fixtures/multifile/message.apib']
            assert.property dredd.configuration.data['./test/fixtures/multifile/message.apib'], 'filename'
            assert.property dredd.configuration.data['./test/fixtures/multifile/message.apib'], 'raw'
            assert.property dredd.configuration.data['./test/fixtures/multifile/message.apib'], 'parsed'

            assert.isObject dredd.configuration.data['./test/fixtures/multifile/greeting.apib']
            assert.property dredd.configuration.data['./test/fixtures/multifile/greeting.apib'], 'filename'
            assert.property dredd.configuration.data['./test/fixtures/multifile/greeting.apib'], 'raw'
            assert.property dredd.configuration.data['./test/fixtures/multifile/greeting.apib'], 'parsed'

            assert.isObject dredd.configuration.data['http://some.path.to/file.apib']
            assert.property dredd.configuration.data['http://some.path.to/file.apib'], 'filename'
            assert.property dredd.configuration.data['http://some.path.to/file.apib'], 'raw'
            assert.property dredd.configuration.data['http://some.path.to/file.apib'], 'parsed'

            assert.isObject dredd.configuration.data['https://another.path.to/apiary.apib']
            assert.property dredd.configuration.data['https://another.path.to/apiary.apib'], 'filename'
            assert.property dredd.configuration.data['https://another.path.to/apiary.apib'], 'raw'
            assert.property dredd.configuration.data['https://another.path.to/apiary.apib'], 'parsed'
            done()

      describe 'when an URL for one blueprint returns 404 not-found', ->
        before ->
          sinon.stub requestStub, 'get', (receivedArgs = {}, cb) ->
            if receivedArgs?.url is 'https://another.path.to/apiary.apib'
              return cb null, {statusCode: 404}, 'Page Not Found'
            cb null, {statusCode:200}, blueprintCode

        after ->
          requestStub.get.restore()

        it 'should exit with an error', (done) ->
          dredd.run (error) ->
            assert.ok error
            assert.instanceOf error, Error
            assert.property error, 'message'
            assert.include error.message, 'Unable to load file from URL'
            done()

        it 'should not execute any transaction', (done) ->
          dredd.run () ->
            assert.notOk dredd.runner.executeTransaction.called
            done()

      describe 'when an URL for one blueprint is unreachable (erroneous)', ->
        before ->
          sinon.stub requestStub, 'get', (receivedArgs = {}, cb) ->
            if receivedArgs?.url is 'http://some.path.to/file.apib'
              # server not found on
              return cb {code: 'ENOTFOUND'}
            cb null, {statusCode:200}, blueprintCode

        after ->
          requestStub.get.restore()

        it 'should exit with an error', (done) ->
          dredd.run (error) ->
            assert.ok error
            assert.instanceOf error, Error
            assert.property error, 'message'
            assert.include error.message, 'Error when loading file from URL'
            done()

        it 'should not execute any transaction', (done) ->
          dredd.run () ->
            assert.notOk dredd.runner.executeTransaction.called
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
      sinon.stub dredd.runner, 'executeTransaction', (transaction, hooks, callback) ->
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
      sinon.stub dredd.runner, 'executeTransaction', (transaction, hooks, callback) ->
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
      sinon.stub dredd.runner, 'executeTransaction', (transaction, hooks, callback) ->
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
      sinon.stub dredd.runner, 'executeTransaction', (transaction, hooks, callback) ->
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
      sinon.stub dredd.runner, 'executeTransaction', (transaction, hooks, callback) ->
        callback()

    afterEach () ->
      dredd.runner.executeTransaction.reset()

    it 'should execute the runtime', (done) ->
      dredd.run (error) ->
        assert.ok dredd.runner.executeTransaction.called
        done()

  describe "#emitStart", () ->

    describe 'no error in reporter occurs', () ->
      PORT = 9876
      dredd = null
      apiaryServer = null

      beforeEach (done) ->
        configuration =
          server: 'http://localhost:3000/'
          options:
            silent: true
            reporter: ['apiary']
            path: ['./test/fixtures/apiary.apib']
            custom:
              apiaryApiUrl: "http://127.0.0.1:#{PORT+1}"
              apiaryApiKey: 'the-key'
              apiaryApiName: 'the-api-name'
              dreddRestDebug: '1'

        dredd = new Dredd(configuration)

        apiary = express()
        apiary.use bodyParser.json(size:'5mb')

        apiary.post '/apis/*', (req, res) ->
          res.type('json')
          res.status(201).send
            _id: '1234_id'
            testRunId: '6789_testRunId'
            reportUrl: 'http://url.me/test/run/1234_id'

        apiary.all '*', (req, res) ->
          res.type 'json'
          res.send {}

        apiaryServer = apiary.listen (PORT+1), ->
          done()

      afterEach (done) ->
        apiaryServer.close () ->
          done()


      it 'should call the callback', (done) ->
        callback = sinon.spy (error) ->
          done error if error
          assert.ok callback.called
          done()

        dredd.emitStart callback

    describe 'an error in the apiary reporter occurs', () ->
      PORT = 9876
      dredd = null
      apiaryServer = null

      beforeEach () ->
        configuration =
          server: 'http://localhost:3000/'
          options:

            reporter: ['apiary']
            path: ['./test/fixtures/apiary.apib']
            custom:
              apiaryApiUrl: "http://127.0.0.1:#{PORT+1}"
              apiaryApiKey: 'the-key'
              apiaryApiName: 'the-api-name'
              dreddRestDebug: '1'

        dredd = new Dredd(configuration)

      it 'should call the callback with error', (done) ->
        callback = sinon.spy (error) ->
          assert.isNotNull error
          assert.ok callback.called
          done()

        dredd.emitStart callback
