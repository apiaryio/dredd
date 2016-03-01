
fs = require 'fs'
{assert} = require 'chai'

{execDredd, startServer} = require './helpers'


PORT = 8887
PORT_NON_EXISTENT = PORT + 1


describe 'CLI - API Description Document', ->
  server = undefined
  configureServer = (app) ->
    app.get '/single-get.apib', (req, res) ->
      res.type 'text/vnd.apiblueprint'
      stream = fs.createReadStream './test/fixtures/single-get.apib'
      stream.pipe res

    app.get '/__non-existent__.apib', (req, res) ->
      res.sendStatus 404

    app.get '/machines', (req, res) ->
      res.send [{type: 'bulldozer', name: 'willy'}]

    app.get '/machines/willy', (req, res) ->
      res.send {type: 'bulldozer', name: 'willy'}

    app.get '/machines/caterpillar', (req, res) ->
      res.send {type: 'bulldozer', name: 'caterpillar'}

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

    describe 'When loaded by glob pattern', ->
      dreddCommand = undefined
      args = ['./test/fixtures/single-g*t.apib', "http://localhost:#{PORT}"]

      beforeEach (done) ->
        execDredd args, (err, commandInfo) ->
          dreddCommand = commandInfo
          done(err)

      it 'should request /machines', ->
        assert.deepEqual server.requestCounts, {'/machines': 1}
      it 'should exit with status 0', ->
        assert.equal dreddCommand.exitStatus, 0

    describe 'When file not found', ->
      dreddCommand = undefined
      args = [
        './test/fixtures/__non-existent__.apib'
        "http://localhost:#{PORT}"
      ]

      beforeEach (done) ->
        execDredd args, (err, commandInfo) ->
          dreddCommand = commandInfo
          done(err)

      it 'should exit with status 1', ->
        assert.equal dreddCommand.exitStatus, 1
      it 'should print error message to stderr', ->
        assert.include dreddCommand.stderr, 'not found'

    describe 'When given path exists, but can\'t be read', ->
      dreddCommand = undefined
      args = [
        './test/fixtures/'
        "http://localhost:#{PORT}"
      ]

      beforeEach (done) ->
        execDredd args, (err, commandInfo) ->
          dreddCommand = commandInfo
          done(err)

      it 'should exit with status 1', ->
        assert.equal dreddCommand.exitStatus, 1
      it 'should print error message to stderr', ->
        assert.include dreddCommand.stderr, 'Error when reading file'


  describe 'When loaded from URL', ->

    describe 'When successfully loaded from URL', ->
      dreddCommand = undefined
      args = [
        "http://localhost:#{PORT}/single-get.apib"
        "http://localhost:#{PORT}"
      ]

      beforeEach (done) ->
        execDredd args, (err, commandInfo) ->
          dreddCommand = commandInfo
          done(err)

      it 'should download API Description Document from server', ->
        assert.equal server.requestCounts['/single-get.apib'], 1
      it 'should request /machines', ->
        assert.deepEqual server.requestCounts, {'/machines': 1, '/single-get.apib': 1}
      it 'should exit with status 0', ->
        assert.equal dreddCommand.exitStatus, 0

    describe 'When URL points to non-existent server', ->
      dreddCommand = undefined
      args = [
        "http://localhost:#{PORT_NON_EXISTENT}/single-get.apib"
        "http://localhost:#{PORT}"
      ]

      beforeEach (done) ->
        execDredd args, (err, commandInfo) ->
          dreddCommand = commandInfo
          done(err)

      it 'should not request server', ->
        assert.isFalse server.requested
      it 'should exit with status 1', ->
        assert.equal dreddCommand.exitStatus, 1
      it 'should print error message to stderr', ->
        assert.include dreddCommand.stderr, 'Error when loading file from URL'
        assert.include dreddCommand.stderr, 'Is the provided URL correct?'
        assert.include dreddCommand.stderr, "http://localhost:#{PORT_NON_EXISTENT}/single-get.apib"

    describe 'When URL points to non-existent resource', ->
      dreddCommand = undefined
      args = [
        "http://localhost:#{PORT}/__non-existent__.apib"
        "http://localhost:#{PORT}"
      ]

      beforeEach (done) ->
        execDredd args, (err, commandInfo) ->
          dreddCommand = commandInfo
          done(err)

      it 'should request server', ->
        assert.isTrue server.requested
      it 'should exit with status 1', ->
        assert.equal dreddCommand.exitStatus, 1
      it 'should print error message to stderr', ->
        assert.include dreddCommand.stderr, 'Unable to load file from URL'
        assert.include dreddCommand.stderr, 'responded with status code 404'
        assert.include dreddCommand.stderr, "http://localhost:#{PORT}/__non-existent__.apib"


  describe 'When loaded by -p/--path', ->

    describe 'When loaded from file', ->
      dreddCommand = undefined
      args = [
        './test/fixtures/single-get.apib'
        "http://localhost:#{PORT}"
        "--path=./test/fixtures/single-get-uri-template.apib"
      ]

      beforeEach (done) ->
        execDredd args, (err, commandInfo) ->
          dreddCommand = commandInfo
          done(err)

      it 'should request /machines, /machines/willy', ->
        assert.deepEqual server.requestCounts, {'/machines': 1, '/machines/willy': 1}
      it 'should exit with status 0', ->
        assert.equal dreddCommand.exitStatus, 0

    describe 'When loaded from URL', ->
      dreddCommand = undefined
      args = [
        './test/fixtures/single-get-uri-template.apib'
        "http://localhost:#{PORT}"
        "--path=http://localhost:#{PORT}/single-get.apib"
      ]

      beforeEach (done) ->
        execDredd args, (err, commandInfo) ->
          dreddCommand = commandInfo
          done(err)

      it 'should download API Description Document from server', ->
        assert.equal server.requestCounts['/single-get.apib'], 1
      it 'should request /machines, /machines/willy', ->
        assert.deepEqual server.requestCounts, {'/machines': 1, '/machines/willy': 1, '/single-get.apib': 1}
      it 'should exit with status 0', ->
        assert.equal dreddCommand.exitStatus, 0

    describe 'When used multiple times', ->
      dreddCommand = undefined
      args = [
        './test/fixtures/single-get.apib'
        "http://localhost:#{PORT}"
        "--path=./test/fixtures/single-get-uri-template.apib"
        "--path=./test/fixtures/single-get-path.apib"
      ]

      beforeEach (done) ->
        execDredd args, (err, commandInfo) ->
          dreddCommand = commandInfo
          done(err)

      it 'should request /machines, /machines/willy, /machines/caterpillar', ->
        assert.deepEqual server.requestCounts, {'/machines': 1, '/machines/willy': 1, '/machines/caterpillar': 1}
      it 'should exit with status 0', ->
        assert.equal dreddCommand.exitStatus, 0

    describe 'When loaded by glob pattern', ->
      dreddCommand = undefined
      args = [
        './test/fixtures/single-get.apib'
        "http://localhost:#{PORT}"
        "--path=./test/fixtures/single-get-uri-temp*.apib"
      ]

      beforeEach (done) ->
        execDredd args, (err, commandInfo) ->
          dreddCommand = commandInfo
          done(err)

      it 'should request /machines, /machines/willy', ->
        assert.deepEqual server.requestCounts, {'/machines': 1, '/machines/willy': 1}
      it 'should exit with status 0', ->
        assert.equal dreddCommand.exitStatus, 0

    describe 'When additional file not found', ->
      dreddCommand = undefined
      args = [
        './test/fixtures/single-get.apib'
        "http://localhost:#{PORT}"
        "--path=./test/fixtures/__non-existent__.apib"
      ]

      beforeEach (done) ->
        execDredd args, (err, commandInfo) ->
          dreddCommand = commandInfo
          done(err)

      it 'should request /machines', ->
        assert.deepEqual server.requestCounts, {'/machines': 1}
      it 'should exit with status 0', ->
        assert.equal dreddCommand.exitStatus, 0
