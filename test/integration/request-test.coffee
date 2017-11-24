{assert} = require('chai')
bodyParser = require('body-parser')

{runDreddWithServer, createServer} = require('./helpers')
Dredd = require('../../src/dredd')


describe('Sending \'application/json\' request', ->
  runtimeInfo = undefined
  contentType = 'application/json'

  before((done) ->
    app = createServer({bodyParser: bodyParser.text({type: contentType})})
    app.post('/data', (req, res) ->
      res.json({test: 'OK'})
    )

    path = './test/fixtures/request/application-json.apib'
    dredd = new Dredd({options: {path}})

    runDreddWithServer(dredd, app, (err, info) ->
      runtimeInfo = info
      done(err)
    )
  )

  it('results in one request being delivered to the server', ->
    assert.isTrue(runtimeInfo.server.requestedOnce)
  )
  it('the request has the expected Content-Type', ->
    assert.equal(runtimeInfo.server.lastRequest.headers['content-type'], contentType)
  )
  it('the request has the expected format', ->
    body = runtimeInfo.server.lastRequest.body
    assert.deepEqual(JSON.parse(body), {test: 42})
  )
  it('results in one passing test', ->
    assert.equal(runtimeInfo.dredd.stats.tests, 1)
    assert.equal(runtimeInfo.dredd.stats.passes, 1)
  )
)


[
    name: 'API Blueprint'
    path: './test/fixtures/request/multipart-form-data.apib'
    supportsContentTypes: true,
  ,
    name: 'Swagger'
    path: './test/fixtures/request/multipart-form-data.yaml'
    supportsContentTypes: false,
].forEach((apiDescription) ->
  describe("Sending 'multipart/form-data' request described in #{apiDescription.name}", ->
    runtimeInfo = undefined
    contentType = 'multipart/form-data'

    before((done) ->
      app = createServer({bodyParser: bodyParser.text({type: contentType})})
      app.post('/data', (req, res) ->
        res.json({test: 'OK'})
      )
      dredd = new Dredd({options: {path: apiDescription.path}})

      runDreddWithServer(dredd, app, (err, info) ->
        runtimeInfo = info
        done(err)
      )
    )

    it('results in one request being delivered to the server', ->
      assert.isTrue(runtimeInfo.server.requestedOnce)
    )
    it('the request has the expected Content-Type', ->
      assert.include(runtimeInfo.server.lastRequest.headers['content-type'], 'multipart/form-data')
    )
    it('the request has the expected format', ->
      lines = [
        '--CUSTOM-BOUNDARY'
        'Content-Disposition: form-data; name="text"'
        'Content-Type: text/plain'
        ''
        'test equals to 42'
        '--CUSTOM-BOUNDARY'
        'Content-Disposition: form-data; name="json"'
        'Content-Type: application/json'
        ''
        '{"test": 42}'
        ''
        '--CUSTOM-BOUNDARY--'
        ''
      ]
      if not apiDescription.supportsContentTypes
        lines = lines.filter((line) -> not line.match(/^Content-Type:/))

      assert.equal(runtimeInfo.server.lastRequest.body, lines.join('\r\n'))
    )
    it('results in one passing test', ->
      assert.equal(runtimeInfo.dredd.stats.tests, 1)
      assert.equal(runtimeInfo.dredd.stats.passes, 1)
    )
  )
)


[
    name: 'API Blueprint'
    path: './test/fixtures/request/application-x-www-form-urlencoded.apib'
  ,
    name: 'Swagger'
    path: './test/fixtures/request/application-x-www-form-urlencoded.yaml'
].forEach((apiDescription) ->
  describe("Sending 'application/x-www-form-urlencoded' request described in #{apiDescription.name}", ->
    runtimeInfo = undefined
    contentType = 'application/x-www-form-urlencoded'

    before((done) ->
      app = createServer({bodyParser: bodyParser.text({type: contentType})})
      app.post('/data', (req, res) ->
        res.json({test: 'OK'})
      )
      dredd = new Dredd({options: {path: apiDescription.path}})

      runDreddWithServer(dredd, app, (err, info) ->
        runtimeInfo = info
        done(err)
      )
    )

    it('results in one request being delivered to the server', ->
      assert.isTrue(runtimeInfo.server.requestedOnce)
    )
    it('the request has the expected Content-Type', ->
      assert.equal(runtimeInfo.server.lastRequest.headers['content-type'], contentType)
    )
    it('the request has the expected format', ->
      # API Blueprint adds extra \n at the end: https://github.com/apiaryio/dredd/issues/67
      assert.equal(runtimeInfo.server.lastRequest.body.trim(), 'test=42')
    )
    it('results in one passing test', ->
      assert.equal(runtimeInfo.dredd.stats.tests, 1)
      assert.equal(runtimeInfo.dredd.stats.passes, 1)
    )
  )
)


describe('Sending \'text/plain\' request', ->
  runtimeInfo = undefined
  contentType = 'text/plain'

  before((done) ->
    path = './test/fixtures/request/text-plain.apib'

    app = createServer({bodyParser: bodyParser.text({type: contentType})})
    app.post('/data', (req, res) ->
      res.json({test: 'OK'})
    )
    dredd = new Dredd({options: {path}})

    runDreddWithServer(dredd, app, (err, info) ->
      runtimeInfo = info
      done(err)
    )
  )

  it('results in one request being delivered to the server', ->
    assert.isTrue(runtimeInfo.server.requestedOnce)
  )
  it('the request has the expected Content-Type', ->
    assert.equal(runtimeInfo.server.lastRequest.headers['content-type'], contentType)
  )
  it('the request has the expected format', ->
    assert.equal(runtimeInfo.server.lastRequest.body, 'test equals to 42\n')
  )
  it('results in one passing test', ->
    assert.equal(runtimeInfo.dredd.stats.tests, 1)
    assert.equal(runtimeInfo.dredd.stats.passes, 1)
  )
)
