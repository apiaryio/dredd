
fs = require 'fs'
os = require 'os'
{assert} = require 'chai'

{runDreddCommand, createServer, DEFAULT_SERVER_PORT} = require '../helpers'


NON_EXISTENT_PORT = DEFAULT_SERVER_PORT + 1


describe 'CLI - API Description Document', ->
  server = undefined
  serverRuntimeInfo = undefined

  beforeEach (done) ->
    app = createServer()

    app.get '/single-get.apib', (req, res) ->
      res.type 'text/vnd.apiblueprint'
      stream = fs.createReadStream './test/fixtures/single-get.apib'
      stream.pipe res

    app.get '/__non-existent__.apib', (req, res) ->
      res.sendStatus 404

    app.get '/machines', (req, res) ->
      res.json [{type: 'bulldozer', name: 'willy'}]

    app.get '/machines/willy', (req, res) ->
      res.json {type: 'bulldozer', name: 'willy'}

    app.get '/machines/caterpillar', (req, res) ->
      res.json {type: 'bulldozer', name: 'caterpillar'}

    app.post '/machine-types', (req, res) ->
      res.json [{name: 'bulldozer'}]

    server = app.listen (err, info) ->
      serverRuntimeInfo = info
      done(err)

  afterEach (done) ->
    server.close(done)


  describe 'When loaded from file', ->

    describe 'When loaded by glob pattern', ->
      dreddCommandInfo = undefined
      args = ['./test/fixtures/single-g*t.apib', "http://127.0.0.1:#{DEFAULT_SERVER_PORT}"]

      beforeEach (done) ->
        runDreddCommand args, (err, info) ->
          dreddCommandInfo = info
          done(err)

      it 'should request /machines', ->
        assert.deepEqual serverRuntimeInfo.requestCounts, {'/machines': 1}
      it 'should exit with status 0', ->
        assert.equal dreddCommandInfo.exitStatus, 0

    describe 'When file not found', ->
      dreddCommandInfo = undefined
      args = [
        './test/fixtures/__non-existent__.apib'
        "http://127.0.0.1:#{DEFAULT_SERVER_PORT}"
      ]

      beforeEach (done) ->
        runDreddCommand args, (err, info) ->
          dreddCommandInfo = info
          done(err)

      it 'should exit with status 1', ->
        assert.equal dreddCommandInfo.exitStatus, 1
      it 'should print error message to stderr', ->
        assert.include dreddCommandInfo.stderr, 'not found'

    describe 'When given path exists, but can\'t be read', ->
      dreddCommandInfo = undefined
      args = [
        os.homedir(),
        "http://127.0.0.1:#{DEFAULT_SERVER_PORT}"
      ]

      beforeEach (done) ->
        runDreddCommand args, (err, info) ->
          dreddCommandInfo = info
          done(err)

      it 'should exit with status 1', ->
        assert.equal dreddCommandInfo.exitStatus, 1
      it 'should print error message to stderr', ->
        assert.include dreddCommandInfo.stderr, 'Error when reading file'


  describe 'When loaded from URL', ->

    describe 'When successfully loaded from URL', ->
      dreddCommandInfo = undefined
      args = [
        "http://127.0.0.1:#{DEFAULT_SERVER_PORT}/single-get.apib"
        "http://127.0.0.1:#{DEFAULT_SERVER_PORT}"
      ]

      beforeEach (done) ->
        runDreddCommand args, (err, info) ->
          dreddCommandInfo = info
          done(err)

      it 'should download API Description Document from server', ->
        assert.equal serverRuntimeInfo.requestCounts['/single-get.apib'], 1
      it 'should request /machines', ->
        assert.deepEqual serverRuntimeInfo.requestCounts, {'/machines': 1, '/single-get.apib': 1}
      it 'should exit with status 0', ->
        assert.equal dreddCommandInfo.exitStatus, 0

    describe 'When URL points to non-existent server', ->
      dreddCommandInfo = undefined
      args = [
        "http://127.0.0.1:#{NON_EXISTENT_PORT}/single-get.apib"
        "http://127.0.0.1:#{DEFAULT_SERVER_PORT}"
      ]

      beforeEach (done) ->
        runDreddCommand args, (err, info) ->
          dreddCommandInfo = info
          done(err)

      it 'should not request server', ->
        assert.isFalse serverRuntimeInfo.requested
      it 'should exit with status 1', ->
        assert.equal dreddCommandInfo.exitStatus, 1
      it 'should print error message to stderr', ->
        assert.include dreddCommandInfo.stderr, 'Error when loading file from URL'
        assert.include dreddCommandInfo.stderr, 'Is the provided URL correct?'
        assert.include dreddCommandInfo.stderr, "http://127.0.0.1:#{NON_EXISTENT_PORT}/single-get.apib"

    describe 'When URL points to non-existent resource', ->
      dreddCommandInfo = undefined
      args = [
        "http://127.0.0.1:#{DEFAULT_SERVER_PORT}/__non-existent__.apib"
        "http://127.0.0.1:#{DEFAULT_SERVER_PORT}"
      ]

      beforeEach (done) ->
        runDreddCommand args, (err, info) ->
          dreddCommandInfo = info
          done(err)

      it 'should request server', ->
        assert.isTrue serverRuntimeInfo.requested
      it 'should exit with status 1', ->
        assert.equal dreddCommandInfo.exitStatus, 1
      it 'should print error message to stderr', ->
        assert.include dreddCommandInfo.stderr, 'Unable to load file from URL'
        assert.include dreddCommandInfo.stderr, 'responded with status code 404'
        assert.include dreddCommandInfo.stderr, "http://127.0.0.1:#{DEFAULT_SERVER_PORT}/__non-existent__.apib"


  describe 'When loaded by -p/--path', ->

    describe 'When loaded from file', ->
      dreddCommandInfo = undefined
      args = [
        './test/fixtures/single-get.apib'
        "http://127.0.0.1:#{DEFAULT_SERVER_PORT}"
        "--path=./test/fixtures/single-get-uri-template.apib"
      ]

      beforeEach (done) ->
        runDreddCommand args, (err, info) ->
          dreddCommandInfo = info
          done(err)

      it 'should request /machines, /machines/willy', ->
        assert.deepEqual serverRuntimeInfo.requestCounts, {'/machines': 1, '/machines/willy': 1}
      it 'should exit with status 0', ->
        assert.equal dreddCommandInfo.exitStatus, 0

    describe 'When loaded from URL', ->
      dreddCommandInfo = undefined
      args = [
        './test/fixtures/single-get-uri-template.apib'
        "http://127.0.0.1:#{DEFAULT_SERVER_PORT}"
        "--path=http://127.0.0.1:#{DEFAULT_SERVER_PORT}/single-get.apib"
      ]

      beforeEach (done) ->
        runDreddCommand args, (err, info) ->
          dreddCommandInfo = info
          done(err)

      it 'should download API Description Document from server', ->
        assert.equal serverRuntimeInfo.requestCounts['/single-get.apib'], 1
      it 'should request /machines, /machines/willy', ->
        assert.deepEqual serverRuntimeInfo.requestCounts, {'/machines': 1, '/machines/willy': 1, '/single-get.apib': 1}
      it 'should exit with status 0', ->
        assert.equal dreddCommandInfo.exitStatus, 0

    describe 'When used multiple times', ->
      dreddCommandInfo = undefined
      args = [
        './test/fixtures/single-get.apib'
        "http://127.0.0.1:#{DEFAULT_SERVER_PORT}"
        "--path=./test/fixtures/single-get-uri-template.apib"
        "--path=./test/fixtures/single-get-path.apib"
      ]

      beforeEach (done) ->
        runDreddCommand args, (err, info) ->
          dreddCommandInfo = info
          done(err)

      it 'should request /machines, /machines/willy, /machines/caterpillar', ->
        assert.deepEqual serverRuntimeInfo.requestCounts, {'/machines': 1, '/machines/willy': 1, '/machines/caterpillar': 1}
      it 'should exit with status 0', ->
        assert.equal dreddCommandInfo.exitStatus, 0

    describe 'When loaded by glob pattern', ->
      dreddCommandInfo = undefined
      args = [
        './test/fixtures/single-get.apib'
        "http://127.0.0.1:#{DEFAULT_SERVER_PORT}"
        "--path=./test/fixtures/single-get-uri-temp*.apib"
      ]

      beforeEach (done) ->
        runDreddCommand args, (err, info) ->
          dreddCommandInfo = info
          done(err)

      it 'should request /machines, /machines/willy', ->
        assert.deepEqual serverRuntimeInfo.requestCounts, {'/machines': 1, '/machines/willy': 1}
      it 'should exit with status 0', ->
        assert.equal dreddCommandInfo.exitStatus, 0

    describe 'When additional file not found', ->
      dreddCommandInfo = undefined
      args = [
        './test/fixtures/single-get.apib'
        "http://127.0.0.1:#{DEFAULT_SERVER_PORT}"
        "--path=./test/fixtures/__non-existent__.apib"
      ]

      beforeEach (done) ->
        runDreddCommand args, (err, info) ->
          dreddCommandInfo = info
          done(err)

      it 'should request /machines', ->
        assert.deepEqual serverRuntimeInfo.requestCounts, {'/machines': 1}
      it 'should exit with status 0', ->
        assert.equal dreddCommandInfo.exitStatus, 0
