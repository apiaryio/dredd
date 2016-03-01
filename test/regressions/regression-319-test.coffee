{assert} = require 'chai'
{exec} = require 'child_process'
express = require 'express'
clone = require 'clone'


PORT = 3333
DREDD_BIN = require.resolve '../../bin/dredd'


runDredd = (descriptionFile, cb) ->
  result = {}
  cmd = "#{DREDD_BIN} #{descriptionFile} http://localhost:#{PORT} -ed"

  cli = exec cmd, (err, stdout, stderr) ->
    result.exitStatus = err?.code or null
    result.stdout = '' + stdout
    result.stderr = '' + stderr

  cli.on 'close', (code) ->
    result.exitStatus ?= code if code
    cb null, result


parseJSON = (body) ->
  return undefined unless body
  try
    JSON.parse body
  catch
    body


parseOutput = (output) ->
  # Parse individual entries (deals also with multi-line entries)
  entries = []
  entry = undefined
  for line in output.split /\r?\n/
    match = line.match /^(\w+): (.+)?$/
    if match
      if entry
        entry.body = entry.body.trim()
        entries.push entry
      entry = {label: match[1], body: match[2] or ''}
    else
      entry.body += "\n#{line.trim()}"

  # Correction of following situation:
  #
  # fail: POST /customers duration: 13ms
  # fail: body: At '/name' Invalid type: null (expected string)
  # body: At '/shoeSize' Invalid type: string (expected number)
  entries = entries.filter (entry, i) ->
    previousEntry = entries[i - 1]
    if entry.label is 'body' and previousEntry.label is 'fail'
      previousEntry.body += '\n' + entry.body
      return false
    return true

  # Re-arrange data from entries
  results = {summary: '', failures: [], bodies: [], schemas: []}
  for entry in entries
    switch entry.label
      when 'body' then results.bodies.push parseJSON entry.body
      when 'bodySchema' then results.schemas.push parseJSON entry.body
      when 'complete' then results.summary = entry.body
      when 'fail' then results.failures.push entry.body
  return results


describe 'Regression: Issue #319', ->
  results = undefined

  brickTypePayload =
    id: ''
    name: ''
    colors: ['red', 'brown']
    dimensions: [[20, 30, 40]]

  brickTypeSchema =
    $schema: 'http://json-schema.org/draft-04/schema#'
    type: 'object'
    properties:
      id: {type: 'string'}
      name: {type: 'string'}
      colors: {type: 'array'}
      dimensions: {type: 'array'}
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
    before (done) ->
      app = express()

      # Attaching endpoint for each testing scenario
      app.get '/bricks/XYZ42', (req, res) ->
        res.setHeader 'Content-Type', 'application/json'
        res.status(200).send brickTypePayload
      app.post '/bricks', (req, res) ->
        res.setHeader 'Content-Type', 'application/json'
        res.status(200).send brickTypePayload
      app.get '/customers', (req, res) ->
        res.setHeader 'Content-Type', 'application/json'
        res.status(200).send userArrayPayload
      app.post '/customers', (req, res) ->
        res.setHeader 'Content-Type', 'application/json'
        res.status(200).send userPayload

      # Spinning up the Express server, running Dredd, and saving results
      server = app.listen PORT, ->
        runDredd './test/fixtures/regression-319.apib', (err, result) ->
          results = parseOutput result.stdout
          server.close done

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

    before (done) ->
      app = express()

      # Attaching endpoint for each testing scenario
      app.get '/bricks/XYZ42', (req, res) ->
        res.setHeader 'Content-Type', 'application/json'
        res.status(200).send incorrectBrickTypePayload
      app.post '/bricks', (req, res) ->
        res.setHeader 'Content-Type', 'application/json'
        res.status(200).send incorrectBrickTypePayload
      app.get '/customers', (req, res) ->
        res.setHeader 'Content-Type', 'application/json'
        res.status(200).send incorrectUserArrayPayload
      app.post '/customers', (req, res) ->
        res.setHeader 'Content-Type', 'application/json'
        res.status(200).send incorrectUserPayload

      # Spinning up the Express server, running Dredd, and saving results
      server = app.listen PORT, ->
        runDredd './test/fixtures/regression-319.apib', (err, result) ->
          results = parseOutput result.stdout
          server.close done

    it 'outputs failures', ->
      assert.ok results.failures.length
    it 'results in exactly four tests', ->
      assert.include results.summary, '4 total'
    it 'results in four failing tests', ->
      assert.include results.summary, '4 failing'

    describe 'Attributes defined in resource are referenced from payload [GET /bricks/XYZ42]', ->
      it 'fails on missing required property and invalid type', ->
        assert.include results.failures[0], 'GET /bricks/XYZ42'
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
        assert.include results.failures[2], 'POST /bricks'
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
        assert.include results.failures[4], 'GET /customers'
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
        assert.include results.failures[6], 'POST /customers'
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
