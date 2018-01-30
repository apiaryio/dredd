{assert} = require('chai')
clone = require('clone')

Dredd = require('../../../src/dredd')
{runDreddCommandWithServer, createServer, parseDreddStdout, DEFAULT_SERVER_PORT} = require('../helpers')


# Helper, tries to parse given HTTP body and in case it can be parsed as JSON,
# it returns the resulting JS object, otherwise it returns whatever came in.
parseIfJson = (body) ->
  return undefined unless body
  try
    JSON.parse(body)
  catch
    body


# This can be removed once https://github.com/apiaryio/dredd/issues/341 is done
parseDreddStdout = (stdout) ->
  # Parse individual entries (deals also with multi-line entries)
  entries = []
  entry = undefined
  for line in stdout.split(/\r?\n/)
    match = line.match(/^(\w+): (.+)?$/)
    if match
      if entry
        entry.body = entry.body.trim()
        entries.push(entry)
      entry = {label: match[1], body: match[2] or ''}
    else
      entry.body += "\n#{line.trim()}"

  # Correction of following situation:
  #
  # fail: POST /customers duration: 13ms
  # fail: body: At '/name' Invalid type: null (expected string)
  # body: At '/shoeSize' Invalid type: string (expected number)
  entries = entries.filter((entry, i) ->
    previousEntry = entries[i - 1]
    if entry.label is 'body' and previousEntry.label is 'fail'
      previousEntry.body += '\n' + entry.body
      return false
    return true
  )

  # Re-arrange data from entries
  results = {summary: '', failures: [], bodies: [], schemas: []}
  for entry in entries
    switch entry.label
      when 'body' then results.bodies.push(parseIfJson(entry.body))
      when 'bodySchema' then results.schemas.push(parseIfJson(entry.body))
      when 'complete' then results.summary = entry.body
      when 'fail' then results.failures.push(entry.body)
  return results


describe 'Regression: Issues #319 and #354', ->
  results = undefined

  brickTypePayload =
    id: ''
    name: ''
    colors: ['red', 'brown']
    dimensions: [[20, 30, 40]]
    producer:
      address:
        city: null
        street: ''

  brickTypeSchema =
    $schema: 'http://json-schema.org/draft-04/schema#'
    type: 'object'
    properties:
      id: {type: 'string'}
      name: {type: 'string'}
      colors: {type: 'array'}
      dimensions: {type: 'array'}
      producer:
        type: 'object'
        properties:
          address:
            type: 'object'
            properties:
              city: {type: ['string', 'null']}
              street: {type: 'string'}
    required: ['name']

  userPayload =
    id: ''
    name: ''
    shoeSize: 42
    address:
      city: null
      street: ''

  userSchema =
    $schema: 'http://json-schema.org/draft-04/schema#'
    type: 'object'
    properties:
      id: {type: 'string'}
      name: {type: 'string'}
      shoeSize: {type: 'number'}
      address:
        type: 'object'
        properties:
          city: {type: ['string', 'null']}
          street: {type: 'string'}

  userArrayPayload = [
    userPayload
  ]

  userArraySchema =
    $schema: 'http://json-schema.org/draft-04/schema#'
    type: 'array'

  describe 'Tested app is consistent with the API description', ->
    beforeEach (done) ->
      app = createServer()

      # Attaching endpoint for each testing scenario
      app.get '/bricks/XYZ42', (req, res) ->
        res.json brickTypePayload
      app.post '/bricks', (req, res) ->
        res.json brickTypePayload
      app.get '/customers', (req, res) ->
        res.json userArrayPayload
      app.post '/customers', (req, res) ->
        res.json userPayload

      # Spinning up the Express server, running Dredd, and saving results
      args = [
        './test/fixtures/regression-319-354.apib',
        "http://127.0.0.1:#{DEFAULT_SERVER_PORT}",
        '--inline-errors',
        '--details',
        '--no-color',
      ]
      runDreddCommandWithServer(args, app, (err, info) ->
        results = parseDreddStdout(info.dredd.stdout) if info
        done(err)
      )

    it 'outputs no failures', ->
      # Intentionally not testing just '.length' as this approach will output the difference
      assert.deepEqual results.failures, []
    it 'results in exactly four tests', ->
      assert.include results.summary, '4 total'
    it 'results in four passing tests', ->
      assert.include results.summary, '4 passing'

    describe 'Attributes defined in resource are referenced from payload [GET /bricks/XYZ42]', ->
      it 'has no request body', ->
        assert.isUndefined results.bodies[0]
      it 'has correct ‘expected’ response body', ->
        assert.deepEqual results.bodies[1], brickTypePayload
      it 'has correct ‘actual’ response body', ->
        assert.deepEqual results.bodies[2], brickTypePayload
      it 'has correct schema', ->
        assert.deepEqual results.schemas[0], brickTypeSchema

    describe 'Attributes defined in resource are referenced from action [POST /bricks]', ->
      it 'has correct request body', ->
        assert.deepEqual results.bodies[3], brickTypePayload
      it 'has correct ‘expected’ response body', ->
        assert.deepEqual results.bodies[4], brickTypePayload
      it 'has correct ‘actual’ response body', ->
        assert.deepEqual results.bodies[5], brickTypePayload
      it 'has correct schema', ->
        assert.deepEqual results.schemas[1], brickTypeSchema

    describe 'Attributes defined as data structure are referenced from payload [GET /customers]', ->
      it 'has no request body', ->
        assert.isUndefined results.bodies[6]
      it 'has correct ‘expected’ response body', ->
        assert.deepEqual results.bodies[7], userArrayPayload
      it 'has correct ‘actual’ response body', ->
        assert.deepEqual results.bodies[8], userArrayPayload
      it 'has correct schema', ->
        assert.deepEqual results.schemas[2], userArraySchema

    describe 'Attributes defined as data structure are referenced from action [POST /customers]', ->
      it 'has correct request body', ->
        assert.deepEqual results.bodies[9], userPayload
      it 'has correct ‘expected’ response body', ->
        assert.deepEqual results.bodies[10], userPayload
      it 'has correct ‘actual’ response body', ->
        assert.deepEqual results.bodies[11], userPayload
      it 'has correct schema', ->
        assert.deepEqual results.schemas[3], userSchema

  describe 'Tested app is inconsistent with the API description', ->
    incorrectBrickTypePayload = clone brickTypePayload
    incorrectBrickTypePayload.id = 42
    delete incorrectBrickTypePayload.name

    incorrectUserPayload = clone userPayload
    incorrectUserPayload.shoeSize = 'XL'
    incorrectUserPayload.name = null

    incorrectUserArrayPayload =
      page: 1
      items: [incorrectUserPayload]

    beforeEach (done) ->
      app = createServer()

      # Attaching endpoint for each testing scenario
      app.get '/bricks/XYZ42', (req, res) ->
        res.json incorrectBrickTypePayload
      app.post '/bricks', (req, res) ->
        res.json incorrectBrickTypePayload
      app.get '/customers', (req, res) ->
        res.json incorrectUserArrayPayload
      app.post '/customers', (req, res) ->
        res.json incorrectUserPayload

      # Spinning up the Express server, running Dredd, and saving results
      args = [
        './test/fixtures/regression-319-354.apib',
        "http://127.0.0.1:#{DEFAULT_SERVER_PORT}",
        '--inline-errors',
        '--details',
        '--no-color',
      ]
      runDreddCommandWithServer(args, app, (err, info) ->
        results = parseDreddStdout(info.dredd.stdout) if info
        done(err)
      )

    it 'outputs failures', ->
      assert.isOk results.failures.length
    it 'results in exactly four tests', ->
      assert.include results.summary, '4 total'
    it 'results in four failing tests', ->
      assert.include results.summary, '4 failing'

    describe 'Attributes defined in resource are referenced from payload [GET /bricks/XYZ42]', ->
      it 'fails on missing required property and invalid type', ->
        assert.include results.failures[0], 'GET (200) /bricks/XYZ42'
        assert.include results.failures[1], 'Missing required property: name'
        assert.include results.failures[1], 'Invalid type: number'
      it 'has no request body', ->
        assert.isUndefined results.bodies[0]
      it 'has correct ‘expected’ response body', ->
        assert.deepEqual results.bodies[1], brickTypePayload
      it 'has incorrect ‘actual’ response body', ->
        assert.deepEqual results.bodies[2], incorrectBrickTypePayload
      it 'has correct schema', ->
        assert.deepEqual results.schemas[0], brickTypeSchema

    describe 'Attributes defined in resource are referenced from action [POST /bricks]', ->
      it 'fails on missing required property and invalid type', ->
        assert.include results.failures[2], 'POST (200) /bricks'
        assert.include results.failures[3], 'Missing required property: name'
        assert.include results.failures[3], 'Invalid type: number'
      it 'has correct request body', ->
        assert.deepEqual results.bodies[3], brickTypePayload
      it 'has correct ‘expected’ response body', ->
        assert.deepEqual results.bodies[4], brickTypePayload
      it 'has incorrect ‘actual’ response body', ->
        assert.deepEqual results.bodies[5], incorrectBrickTypePayload
      it 'has correct schema', ->
        assert.deepEqual results.schemas[1], brickTypeSchema

    describe 'Attributes defined as data structure are referenced from payload [GET /customers]', ->
      it 'fails on invalid type', ->
        assert.include results.failures[4], 'GET (200) /customers'
        assert.include results.failures[5], 'Invalid type: object'
      it 'has no request body', ->
        assert.isUndefined results.bodies[6]
      it 'has correct ‘expected’ response body', ->
        assert.deepEqual results.bodies[7], userArrayPayload
      it 'has incorrect ‘actual’ response body', ->
        assert.deepEqual results.bodies[8], incorrectUserArrayPayload
      it 'has correct schema', ->
        assert.deepEqual results.schemas[2], userArraySchema

    describe 'Attributes defined as data structure are referenced from action [POST /customers]', ->
      it 'fails on invalid types', ->
        assert.include results.failures[6], 'POST (200) /customers'
        assert.include results.failures[7], 'Invalid type: null'
        assert.include results.failures[7], 'Invalid type: string'
      it 'has correct request body', ->
        assert.deepEqual results.bodies[9], userPayload
      it 'has correct ‘expected’ response body', ->
        assert.deepEqual results.bodies[10], userPayload
      it 'has incorrect ‘actual’ response body', ->
        assert.deepEqual results.bodies[11], incorrectUserPayload
      it 'has correct schema', ->
        assert.deepEqual results.schemas[3], userSchema
