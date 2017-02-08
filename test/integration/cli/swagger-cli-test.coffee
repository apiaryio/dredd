
fs = require 'fs'
{assert} = require 'chai'

{runDreddCommand, createServer, DEFAULT_SERVER_PORT} = require '../helpers'


describe 'CLI - Swagger Document', ->
  server = undefined
  serverRuntimeInfo = undefined

  beforeEach (done) ->
    app = createServer()

    app.get '/single-get.yaml', (req, res) ->
      res.type 'application/yaml'
      stream = fs.createReadStream './test/fixtures/single-get.yaml'
      stream.pipe res

    app.get '/machines', (req, res) ->
      res.send [{type: 'bulldozer', name: 'willy'}]

    app.get '/machines/willy', (req, res) ->
      res.send {type: 'bulldozer', name: 'willy'}

    app.get '/machines/caterpillar', (req, res) ->
      res.send {type: 'bulldozer', name: 'caterpillar'}

    app.post '/machine-types', (req, res) ->
      res.send [{name: 'bulldozer'}]

    server = app.listen (err, info) ->
      serverRuntimeInfo = info
      done(err)

  afterEach (done) ->
    server.close(done)


  describe 'When loaded from file', ->

    describe 'When successfully loaded', ->
      dreddCommandInfo = undefined
      args = ['./test/fixtures/single-get.yaml', "http://127.0.0.1:#{DEFAULT_SERVER_PORT}"]

      beforeEach (done) ->
        runDreddCommand args, (err, info) ->
          dreddCommandInfo = info
          done(err)

      it 'should request /machines', ->
        assert.deepEqual serverRuntimeInfo.requestCounts, {'/machines': 1}
      it 'should exit with status 0', ->
        assert.equal dreddCommandInfo.exitStatus, 0

    describe 'When Swagger is loaded with errors', ->
      dreddCommandInfo = undefined
      args = [
        './test/fixtures/error-swagger.yaml'
        "http://127.0.0.1:#{DEFAULT_SERVER_PORT}"
      ]

      beforeEach (done) ->
        runDreddCommand args, (err, info) ->
          dreddCommandInfo = info
          done(err)

      it 'should exit with status 1', ->
        assert.equal dreddCommandInfo.exitStatus, 1
      it 'should print error message to stderr', ->
        assert.include dreddCommandInfo.stderr, 'Error when processing API description'

    describe 'When Swagger is loaded with warnings', ->
      dreddCommandInfo = undefined
      args = [
        './test/fixtures/warning-swagger.yaml'
        "http://127.0.0.1:#{DEFAULT_SERVER_PORT}"
        '--no-color'
      ]

      beforeEach (done) ->
        runDreddCommand args, (err, info) ->
          dreddCommandInfo = info
          done(err)

      it 'should exit with status 0', ->
        assert.equal dreddCommandInfo.exitStatus, 0
      it 'should print warning to stdout', ->
        assert.include dreddCommandInfo.stdout, 'warn: Parser warning'
