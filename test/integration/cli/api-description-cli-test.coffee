fs = require 'fs'
os = require 'os'
{assert} = require 'chai'

{runDreddCommandWithServer, createServer, DEFAULT_SERVER_PORT} = require '../helpers'


NON_EXISTENT_PORT = DEFAULT_SERVER_PORT + 1


describe 'CLI - API Description Document', ->

  describe 'When loaded from file', ->

    describe 'When loaded by glob pattern', ->
      runtimeInfo = undefined
      args = ['./test/fixtures/single-g*t.apib', "http://127.0.0.1:#{DEFAULT_SERVER_PORT}"]

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

    describe 'When file not found', ->
      runtimeInfo = undefined
      args = [
        './test/fixtures/__non-existent__.apib'
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
        assert.include runtimeInfo.dredd.stderr, 'not found'

    describe 'When given path exists, but can\'t be read', ->
      runtimeInfo = undefined
      args = [
        os.homedir(),
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
        assert.include runtimeInfo.dredd.stderr, 'Error when reading file'


  describe 'When loaded from URL', ->

    describe 'When successfully loaded from URL', ->
      runtimeInfo = undefined
      args = [
        "http://127.0.0.1:#{DEFAULT_SERVER_PORT}/single-get.apib"
        "http://127.0.0.1:#{DEFAULT_SERVER_PORT}"
      ]

      beforeEach (done) ->
        app = createServer()
        app.get '/single-get.apib', (req, res) ->
          res.type 'text/vnd.apiblueprint'
          stream = fs.createReadStream './test/fixtures/single-get.apib'
          stream.pipe res
        app.get '/machines', (req, res) ->
          res.json [{type: 'bulldozer', name: 'willy'}]

        runDreddCommandWithServer args, app, (err, info) ->
          runtimeInfo = info
          done(err)

      it 'should download API Description Document from server', ->
        assert.equal runtimeInfo.server.requestCounts['/single-get.apib'], 1
      it 'should request /machines', ->
        assert.deepEqual runtimeInfo.server.requestCounts, {'/machines': 1, '/single-get.apib': 1}
      it 'should exit with status 0', ->
        assert.equal runtimeInfo.dredd.exitStatus, 0

    describe 'When URL points to non-existent server', ->
      runtimeInfo = undefined
      args = [
        "http://127.0.0.1:#{NON_EXISTENT_PORT}/single-get.apib"
        "http://127.0.0.1:#{DEFAULT_SERVER_PORT}"
      ]

      beforeEach (done) ->
        app = createServer()
        runDreddCommandWithServer args, app, (err, info) ->
          runtimeInfo = info
          done(err)

      it 'should not request server', ->
        assert.isFalse runtimeInfo.server.requested
      it 'should exit with status 1', ->
        assert.equal runtimeInfo.dredd.exitStatus, 1
      it 'should print error message to stderr', ->
        assert.include runtimeInfo.dredd.stderr, 'Error when loading file from URL'
        assert.include runtimeInfo.dredd.stderr, 'Is the provided URL correct?'
        assert.include runtimeInfo.dredd.stderr, "http://127.0.0.1:#{NON_EXISTENT_PORT}/single-get.apib"

    describe 'When URL points to non-existent resource', ->
      runtimeInfo = undefined
      args = [
        "http://127.0.0.1:#{DEFAULT_SERVER_PORT}/__non-existent__.apib"
        "http://127.0.0.1:#{DEFAULT_SERVER_PORT}"
      ]

      beforeEach (done) ->
        app = createServer()
        app.get '/__non-existent__.apib', (req, res) ->
          res.sendStatus 404

        runDreddCommandWithServer args, app, (err, info) ->
          runtimeInfo = info
          done(err)

      it 'should request server', ->
        assert.isTrue runtimeInfo.server.requested
      it 'should exit with status 1', ->
        assert.equal runtimeInfo.dredd.exitStatus, 1
      it 'should print error message to stderr', ->
        assert.include runtimeInfo.dredd.stderr, 'Unable to load file from URL'
        assert.include runtimeInfo.dredd.stderr, 'responded with status code 404'
        assert.include runtimeInfo.dredd.stderr, "http://127.0.0.1:#{DEFAULT_SERVER_PORT}/__non-existent__.apib"


  describe 'When loaded by -p/--path', ->

    describe 'When loaded from file', ->
      runtimeInfo = undefined
      args = [
        './test/fixtures/single-get.apib'
        "http://127.0.0.1:#{DEFAULT_SERVER_PORT}"
        "--path=./test/fixtures/single-get-uri-template.apib"
      ]

      beforeEach (done) ->
        app = createServer()
        app.get '/machines', (req, res) ->
          res.json [{type: 'bulldozer', name: 'willy'}]
        app.get '/machines/willy', (req, res) ->
          res.json {type: 'bulldozer', name: 'willy'}

        runDreddCommandWithServer args, app, (err, info) ->
          runtimeInfo = info
          done(err)

      it 'should request /machines, /machines/willy', ->
        assert.deepEqual runtimeInfo.server.requestCounts, {'/machines': 1, '/machines/willy': 1}
      it 'should exit with status 0', ->
        assert.equal runtimeInfo.dredd.exitStatus, 0

    describe 'When loaded from URL', ->
      runtimeInfo = undefined
      args = [
        './test/fixtures/single-get-uri-template.apib'
        "http://127.0.0.1:#{DEFAULT_SERVER_PORT}"
        "--path=http://127.0.0.1:#{DEFAULT_SERVER_PORT}/single-get.yaml"
      ]

      beforeEach (done) ->
        app = createServer()
        app.get '/single-get.yaml', (req, res) ->
          res.type 'application/yaml'
          stream = fs.createReadStream './test/fixtures/single-get.yaml'
          stream.pipe res
        app.get '/machines', (req, res) ->
          res.json [{type: 'bulldozer', name: 'willy'}]
        app.get '/machines/willy', (req, res) ->
          res.json {type: 'bulldozer', name: 'willy'}

        runDreddCommandWithServer args, app, (err, info) ->
          runtimeInfo = info
          done(err)

      it 'should download API Description Document from server', ->
        assert.equal runtimeInfo.server.requestCounts['/single-get.yaml'], 1
      it 'should request /machines, /machines/willy', ->
        assert.deepEqual runtimeInfo.server.requestCounts, {'/machines': 1, '/machines/willy': 1, '/single-get.yaml': 1}
      it 'should exit with status 0', ->
        assert.equal runtimeInfo.dredd.exitStatus, 0

    describe 'When used multiple times', ->
      runtimeInfo = undefined
      args = [
        './test/fixtures/single-get.apib'
        "http://127.0.0.1:#{DEFAULT_SERVER_PORT}"
        "--path=./test/fixtures/single-get-uri-template.apib"
        "--path=./test/fixtures/single-get-path.apib"
      ]

      beforeEach (done) ->
        app = createServer()
        app.get '/machines', (req, res) ->
          res.json [{type: 'bulldozer', name: 'willy'}]
        app.get '/machines/willy', (req, res) ->
          res.json {type: 'bulldozer', name: 'willy'}
        app.get '/machines/caterpillar', (req, res) ->
          res.json {type: 'bulldozer', name: 'caterpillar'}

        runDreddCommandWithServer args, app, (err, info) ->
          runtimeInfo = info
          done(err)

      it 'should request /machines, /machines/willy, /machines/caterpillar', ->
        assert.deepEqual runtimeInfo.server.requestCounts, {'/machines': 1, '/machines/willy': 1, '/machines/caterpillar': 1}
      it 'should exit with status 0', ->
        assert.equal runtimeInfo.dredd.exitStatus, 0

    describe 'When loaded by glob pattern', ->
      runtimeInfo = undefined
      args = [
        './test/fixtures/single-get.apib'
        "http://127.0.0.1:#{DEFAULT_SERVER_PORT}"
        "--path=./test/fixtures/single-get-uri-temp*.apib"
      ]

      beforeEach (done) ->
        app = createServer()
        app.get '/machines', (req, res) ->
          res.json [{type: 'bulldozer', name: 'willy'}]
        app.get '/machines/willy', (req, res) ->
          res.json {type: 'bulldozer', name: 'willy'}

        runDreddCommandWithServer args, app, (err, info) ->
          runtimeInfo = info
          done(err)

      it 'should request /machines, /machines/willy', ->
        assert.deepEqual runtimeInfo.server.requestCounts, {'/machines': 1, '/machines/willy': 1}
      it 'should exit with status 0', ->
        assert.equal runtimeInfo.dredd.exitStatus, 0

    describe 'When additional file not found', ->
      runtimeInfo = undefined
      args = [
        './test/fixtures/single-get.apib'
        "http://127.0.0.1:#{DEFAULT_SERVER_PORT}"
        "--path=./test/fixtures/__non-existent__.apib"
      ]

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
