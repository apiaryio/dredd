{assert} = require 'chai'
proxyquire = require 'proxyquire'
sinon = require 'sinon'
clone = require 'clone'

globStub = require 'glob'
pathStub = require 'path'
loggerStub = require '../../src/logger'
hooksStub = require '../../src/hooks'
hooksWorkerClientStub = require '../../src/hooks-worker-client'

proxyquireStub = require 'proxyquire'
proxyquireSpy = sinon.spy proxyquireStub.noCallThru()
proxyquireStub.noCallThru = () ->
  proxyquireSpy

sandboxHooksCodeSpy = sinon.spy require '../../src/sandbox-hooks-code'
fsStub = require 'fs'

addHooks = proxyquire  '../../src/add-hooks', {
  'logger': loggerStub,
  'glob': globStub,
  'pathStub': pathStub,
  'hooks': hooksStub,
  'proxyquire': proxyquireStub
  './sandbox-hooks-code': sandboxHooksCodeSpy
  './hooks-worker-client': hooksWorkerClientStub
  'fs': fsStub
}

describe 'addHooks(runner, transactions, callback)', () ->

  transactions = {}
  server = null

  before () ->
    loggerStub.transports.console.silent = true

  after () ->
    loggerStub.transports.console.silent = false

  describe 'constructor', ->
    runner =
      logs: ['item']
      configuration:
        options:
          hookfiles: null

    it 'should create hooks instance at runner.hooks', (done)->
      addHooks runner, transactions, (err) ->
        return err if err
        assert.isDefined runner.hooks
        assert.instanceOf runner.hooks, hooksStub
        assert.strictEqual runner.hooks, runner.hooks
        assert.nestedProperty runner, 'hooks.transactions'
        done()


    it 'should pass runner.logs to runner.hooks.logs', (done)->
      addHooks runner, transactions, (err) ->
        return err if err
        assert.isDefined runner.hooks
        assert.instanceOf runner.hooks, hooksStub
        assert.nestedProperty runner, 'hooks.logs'
        assert.isDefined runner.hooks.logs
        assert.strictEqual runner.hooks.logs, runner.logs
        done()


  describe 'with no pattern', () ->

    runner = null

    before () ->
      runner =
        configuration:
          options:
            hookfiles: null

      sinon.spy globStub, 'sync'

    after () ->
      globStub.sync.restore()

    it 'should not expand any glob', (done) ->
      addHooks runner, transactions, (err) ->
        assert.isOk globStub.sync.notCalled
        done()

  describe 'with non `nodejs` language option', () ->
    runner = null

    beforeEach ->
      runner =
        configuration:
          options:
            language: 'ruby'
            hookfiles: './some/ruby/file.rb'

      sinon.stub(hooksWorkerClientStub.prototype, 'start').callsFake (cb) -> cb()

    afterEach ->
      hooksWorkerClientStub.prototype.start.restore()

    it 'should start the hooks worker client', (done) ->
      addHooks runner, transactions, (err) ->
        return done err if err
        assert.isTrue hooksWorkerClientStub.prototype.start.called
        done()


  describe 'with valid pattern', () ->
    runner = null
    beforeEach ->
      runner =
        configuration:
          options:
            hookfiles: './**/*_hooks.*'

    it 'should return files', (done) ->
      sinon.spy globStub, 'sync'
      addHooks runner, transactions, (err) ->
        return done err if err
        assert.isOk globStub.sync.called
        globStub.sync.restore()
        done()

    it 'should return files alphabetically sorted', (done) ->
      runner =
        configuration:
          options:
            hookfiles: ['./**/*_hooks.*', '/baz/x.js', '/foo/y.js', '/bar/z.js', '/foo/a.js', '/bar/b.js', '/baz/c.js', '/foo/o.js', '/bar/p.js']

      addHooks runner, transactions, (err) ->
        return done err if err

        # We need >10 files to prove that sorting is ok
        expected = [
          'a.js',
          'b.js',
          'c.js',
          'multifile_hooks.coffee',
          'o.js',
          'p.js',
          'test2_hooks.js',
          'test_hooks.coffee',
          'x.js',
          'y.js',
          'z.js',
        ]

        actual = runner.hooks.configuration.options.hookfiles

        assert.notEqual actual.length, 0

        actual.forEach (item, index) ->
          assert.include item, expected[index]

        done()

    it 'should return files with resolved paths', (done) ->
      addHooks runner, transactions, (err) ->
        return done err if err

        expected = [
          pathStub.resolve(process.cwd(), './test/fixtures/multifile/multifile_hooks.coffee'),
          pathStub.resolve(process.cwd(), './test/fixtures/test2_hooks.js'),
          pathStub.resolve(process.cwd(), './test/fixtures/test_hooks.coffee')
        ]

        actual = runner.hooks.configuration.options.hookfiles

        assert.deepEqual actual, expected

        done()

    it 'should return resolved path for non existing file', (done) ->
      runner =
        configuration:
          options:
            hookfiles: 'foo/bar/hooks'

      addHooks runner, transactions, (err) ->
        return done err if err

        actual = runner.hooks.configuration.options.hookfiles
        expected = [pathStub.resolve(process.cwd(), 'foo/bar/hooks')]

        assert.deepEqual actual, expected

        done()

    it 'should handle mixed filepaths and globs', (done) ->
      runner =
        configuration:
          options:
            hookfiles: ['foo/bar/hooks', './**/*_hooks.*']

      addHooks runner, transactions, (err) ->
        return done err if err

        actual = runner.hooks.configuration.options.hookfiles
        expected = [
          pathStub.resolve(process.cwd(), 'foo/bar/hooks')
          pathStub.resolve(process.cwd(), './test/fixtures/multifile/multifile_hooks.coffee')
          pathStub.resolve(process.cwd(), './test/fixtures/test2_hooks.js')
          pathStub.resolve(process.cwd(), './test/fixtures/test_hooks.coffee')
        ]

        assert.deepEqual actual, expected

        done()

    describe 'when the hook file(s) doesn\'t exist', () ->
      describe 'for all hook files', () ->
        it 'should return an error', (done) ->
          runner =
            configuration:
              options:
                hookfiles: './**/*_hooks.balony'
          addHooks runner, transactions, (error) ->
            assert.isOk error
            done()
          
      describe 'for some hook files', () ->
        it 'should return an error', (done) ->
          runner =
            configuration:
              options:
                hookfiles: ['./**/*_hooks.coffee', './**/*_hooks.balony']
          addHooks runner, transactions, (error) ->
            assert.isOk error
            done()
          
      describe 'for a single hook file', () ->
        it 'should return an error', (done) ->
          runner =
            configuration:
              options:
                hookfiles: './test/fixtures/balony_hooks.balony'
          addHooks runner, transactions, (error) ->
            assert.isOk error
            done()
          

    describe 'when files are valid js/coffeescript', () ->
      runner = null
      before () ->
        runner =
          configuration:
            options:
              hookfiles: './**/*_hooks.*'
        sinon.stub(globStub, 'sync').callsFake (pattern) ->
          ['file1.js', 'file2.coffee']
        sinon.stub(pathStub, 'resolve').callsFake (path, rel) ->
          '/Users/netmilk/projects/dredd/file2.coffee'

      after () ->
        globStub.sync.restore()
        pathStub.resolve.restore()

      it 'should load the files', (done) ->
        addHooks runner, transactions, (err) ->
          return done err if err
          assert.isOk pathStub.resolve.called
          done()

      it 'should add configuration object to the hooks object proxyquired to the each hookfile', (done) ->
        addHooks runner, transactions, (err) ->
          return done err if err
          call = proxyquireSpy.getCall(0)
          hooksObject = call.args[1]['hooks']
          assert.property hooksObject, 'configuration'
          done()

  describe 'when sandboxed mode is on', () ->
    describe 'when hookfiles option is given', () ->
      runner = {}
      beforeEach (done) ->
        runner =
          configuration:
            options:
              hookfiles: './test/fixtures/sandboxed-hook.js'
              sandbox: true

        sinon.spy loggerStub, 'warn'
        sinon.spy loggerStub, 'info'
        sinon.spy fsStub, 'readFile'
        proxyquireSpy.reset()
        sandboxHooksCodeSpy.reset()
        done()

      afterEach (done) ->
        loggerStub.warn.restore()
        loggerStub.info.restore()
        fsStub.readFile.restore()
        proxyquireSpy.reset()
        sandboxHooksCodeSpy.reset()
        done()

      it 'should not use proxyquire', (done) ->
        addHooks runner, transactions, (err) ->
          return done err if err
          assert.isFalse proxyquireSpy.called
          done()

      it 'should load files from the filesystem', (done) ->
        addHooks runner, transactions, (err) ->
          return done err if err
          assert.isTrue fsStub.readFile.called
          done()

      it 'should run the loaded code', (done) ->
        addHooks runner, transactions, (err) ->
          return err if err
          assert.isTrue sandboxHooksCodeSpy.called
          done()

      it 'should add hook functions strings to the runner object', (done) ->
        addHooks runner, transactions, (err) ->
          return err if err
          assert.property runner.hooks.afterHooks, 'Machines > Machines collection > Get Machines'
          done()

    describe 'when hookfiles option is not given and hooks are passed as a string from Dredd class', () ->
      runner = {}
      beforeEach ->
        runner =
          configuration:
            hooksData:
              "some-filename.js": """
              after('Machines > Machines collection > Get Machines', function(transaction){
                transaction['fail'] = 'failed in sandboxed hook';
              });
              """
            options:
              sandbox: true

        sinon.spy loggerStub, 'warn'
        sinon.spy loggerStub, 'info'
        sinon.spy fsStub, 'readFile'
        proxyquireSpy.reset()
        sandboxHooksCodeSpy.reset()

      afterEach ->
        loggerStub.warn.restore()
        loggerStub.info.restore()
        fsStub.readFile.restore()
        proxyquireSpy.reset()
        sandboxHooksCodeSpy.reset()

      it 'should not use proxyquire', (done) ->
        addHooks runner, transactions, (err) ->
          return done err if err
          assert.isFalse proxyquireSpy.called
          done()

      it 'should run the loaded code', (done) ->
        addHooks runner, transactions, (err) ->
          return err if err
          assert.isTrue sandboxHooksCodeSpy.called
          done()

      it 'should add hook functions strings to the runner object', (done) ->
        addHooks runner, transactions, (err) ->
          return err if err
          assert.property runner.hooks.afterHooks, 'Machines > Machines collection > Get Machines'
          done()

    describe 'when hooks are passed as a string from Dredd class', () ->
      runner = {}
      beforeEach ->
        runner =
          configuration:
            hooksData:
              "some-filename.js": """
              after('Machines > Machines collection > Get Machines', function(transaction){
                transaction['fail'] = 'failed in sandboxed hook';
              });
              """
            options: {}

      it 'should throw a "not implemented" exception', (done) ->
        addHooks runner, transactions, (err) ->
          assert.isDefined err
          assert.include err.message, 'not implemented'
          done()


    describe 'when buggy transaction name is used (#168)', () ->
      describe 'when sandboxed', () ->
        it 'should remove leading " > " from transaction names', (done) ->
          runner =
            configuration:
              hooksData:
                "hookfile.js": """
                after(' > Machines collection > Get Machines', function(transaction){
                  transaction['fail'] = 'failed in sandboxed hook';
                });
                before(' > Machines collection > Get Machines', function(transaction){
                  transaction['fail'] = 'failed in sandboxed hook';
                });
                """
              options:
                sandbox: true

          addHooks runner, transactions, (err) ->
            assert.notProperty runner.hooks.afterHooks, ' > Machines collection > Get Machines'
            assert.notProperty runner.hooks.afterHooks, ' > Machines collection > Get Machines'
            done()

        it 'should contain transaction with fixed name', (done) ->
          runner =
            configuration:
              hooksData:
                "hookfile.js": """
                after(' > Machines collection > Get Machines', function(transaction){
                  transaction['fail'] = 'failed in sandboxed hook';
                });
                before(' > Machines collection > Get Machines', function(transaction){
                  transaction['fail'] = 'failed in sandboxed hook';
                });
                """
              options:
                sandbox: true

          addHooks runner, transactions, (err) ->
            assert.property runner.hooks.afterHooks, 'Machines collection > Get Machines'
            assert.property runner.hooks.afterHooks, 'Machines collection > Get Machines'
            done()

  describe 'when not sandboxed', () ->
    it 'should remove leading " > " from transaction names', (done) ->
      runner =
        configuration:
          options:
            hookfiles: './test/fixtures/groupless-names.js'

      addHooks runner, transactions, (err) ->
        assert.notProperty runner.hooks.afterHooks, ' > Machines collection > Get Machines'
        assert.notProperty runner.hooks.afterHooks, ' > Machines collection > Get Machines'
        done()

    it 'should contain transaction with fixed name', (done) ->
      runner =
        configuration:
          options:
            hookfiles: './test/fixtures/groupless-names.js'

      addHooks runner, transactions, (err) ->
        assert.property runner.hooks.afterHooks, 'Machines collection > Get Machines'
        assert.property runner.hooks.afterHooks, 'Machines collection > Get Machines'
        done()
