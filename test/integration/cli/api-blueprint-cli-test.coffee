
fs = require 'fs'
{assert} = require 'chai'

{execDredd, startServer} = require './helpers'


PORT = 8887


describe 'CLI - API Blueprint Document', ->
  server = undefined
  configureServer = (app) ->
    app.get '/single-get.apib', (req, res) ->
      res.type 'text/vnd.apiblueprint'
      stream = fs.createReadStream './test/fixtures/single-get.apib'
      stream.pipe res

    app.get '/machines', (req, res) ->
      res.send [{type: 'bulldozer', name: 'willy'}]

    app.get '/machines/willy', (req, res) ->
      res.send {type: 'bulldozer', name: 'willy'}

    app.get '/machines/caterpillar', (req, res) ->
      res.send {type: 'bulldozer', name: 'caterpillar'}

    app.post '/machine-types', (req, res) ->
      res.send [{name: 'bulldozer'}]

  beforeEach (done) ->
    startServer configureServer, PORT, (err, serverInfo) ->
      server = serverInfo
      done(err)

  afterEach (done) ->
    server.process.close(done)


  describe 'When loaded from file', ->

    describe 'When successfully loaded', ->
      dreddCommand = undefined
      args = ['./test/fixtures/single-get.apib', "http://localhost:#{PORT}"]

      beforeEach (done) ->
        execDredd args, (err, commandInfo) ->
          dreddCommand = commandInfo
          done(err)

      it 'should request /machines', ->
        assert.deepEqual server.requestCounts, {'/machines': 1}
      it 'should exit with status 0', ->
        assert.equal dreddCommand.exitStatus, 0

    describe 'When API Blueprint is loaded with errors', ->
      dreddCommand = undefined
      args = [
        './test/fixtures/error-blueprint.apib'
        "http://localhost:#{PORT}"
      ]

      beforeEach (done) ->
        execDredd args, (err, commandInfo) ->
          dreddCommand = commandInfo
          done(err)

      it 'should exit with status 1', ->
        assert.equal dreddCommand.exitStatus, 1
      it 'should print error message to stderr', ->
        assert.include dreddCommand.stderr, 'Error when processing API description'

    describe 'When API Blueprint is loaded with warnings', ->
      dreddCommand = undefined
      args = [
        './test/fixtures/warning-blueprint.apib'
        "http://localhost:#{PORT}"
        '--no-color'
      ]

      beforeEach (done) ->
        execDredd args, (err, commandInfo) ->
          dreddCommand = commandInfo
          done(err)

      it 'should exit with status 0', ->
        assert.equal dreddCommand.exitStatus, 0
      it 'should print warning to stdout', ->
        assert.include dreddCommand.stdout, 'warn: Compilation warning'
