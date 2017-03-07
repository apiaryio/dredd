fs = require 'fs'
{assert} = require 'chai'

{runDreddCommandWithServer, createServer, DEFAULT_SERVER_PORT} = require '../helpers'


describe 'CLI - Swagger Document', ->

  describe 'When loaded from file', ->

    describe 'When successfully loaded', ->
      runtimeInfo = undefined
      args = ['./test/fixtures/single-get.yaml', "http://127.0.0.1:#{DEFAULT_SERVER_PORT}"]

      beforeEach (done) ->
        app = createServer()
        app.get '/machines', (req, res) ->
          res.json [{type: 'bulldozer', name: 'willy'}]

        runDreddCommandWithServer args, app, (err, info) ->
          runtimeInfo = info
          done(err)

      it 'should request /machines', ->
        assert.deepEqual runtimeInfo.server.requestCounts, {'/machines': 1}
      it 'should exit with status 0', ->
        assert.equal runtimeInfo.dredd.exitStatus, 0

    describe 'When Swagger is loaded with errors', ->
      runtimeInfo = undefined
      args = [
        './test/fixtures/error-swagger.yaml'
        "http://127.0.0.1:#{DEFAULT_SERVER_PORT}"
      ]

      beforeEach (done) ->
        app = createServer()
        runDreddCommandWithServer args, app, (err, info) ->
          runtimeInfo = info
          done(err)

      it 'should exit with status 1', ->
        assert.equal runtimeInfo.dredd.exitStatus, 1
      it 'should print error message to stderr', ->
        assert.include runtimeInfo.dredd.stderr, 'Error when processing API description'

    describe 'When Swagger is loaded with warnings', ->
      runtimeInfo = undefined
      args = [
        './test/fixtures/warning-swagger.yaml'
        "http://127.0.0.1:#{DEFAULT_SERVER_PORT}"
        '--no-color'
      ]

      beforeEach (done) ->
        app = createServer()
        app.get '/machines', (req, res) ->
          res.json [{type: 'bulldozer', name: 'willy'}]

        runDreddCommandWithServer args, app, (err, info) ->
          runtimeInfo = info
          done(err)

      it 'should exit with status 0', ->
        assert.equal runtimeInfo.dredd.exitStatus, 0
      it 'should print warning to stdout', ->
        assert.include runtimeInfo.dredd.stdout, 'warn: Parser warning'
