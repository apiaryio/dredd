{assert} = require('chai')
{exec} = require('child_process')
express = require 'express'


PORT = 3333


runDredd = (descriptionFile, cb) ->
  result = {}
  cmd = "./bin/dredd #{descriptionFile} http://localhost:#{PORT} -ed"

  cli = exec(cmd, (err, stdout, stderr) ->
    result.exitStatus = err?.code or null
    result.stdout = '' + stdout
    result.stderr = '' + stderr
  )
  cli.on('close', (code) ->
    result.exitStatus ?= code if code
    cb(null, result)
  )


parseOutput = (output) ->
  # Parse individual entries (deals also with multi-line entries)
  entries = []
  entry = undefined
  for line in output.split(/\r?\n/)
    match = line.match(/^(\w+): (.+)?$/)
    if match
      if entry
        entry.body = entry.body.trim()
        entries.push(entry)
      entry = {label: match[1], body: match[2] or ''}
    else
      entry.body += "\n#{line.trim()}"

  # Re-arrange data from entries
  results = {summary: '', failures: [], bodies: [], schemas: []}
  for entry in entries
    switch entry.label
      when 'body' then results.bodies.push(JSON.parse(entry.body) if entry.body)
      when 'bodySchema' then results.schemas.push(JSON.parse(entry.body) if entry.body)
      when 'complete' then results.summary = entry.body
      when 'fail' then results.failures.push(entry.body)
  return results


describe('Regression: Issue #319', ->
  results = undefined

  brickTypePayload =
    id: ''
    name: ''
    colors: ['red', 'brown']
    dimensions: [[20, 30, 40]]

  brickTypeSchema =
    $schema: 'http://json-schema.org/draft-04/schema#'
    type: 'object'

  userPayload =
    id: ''
    name: ''
    shoeSize: 42

  userSchema = # TODO
    $schema: 'http://json-schema.org/draft-04/schema#'
    type: 'object'

  userArrayPayload = [
    userPayload
  ]

  userArraySchema = # TODO
    $schema: 'http://json-schema.org/draft-04/schema#'
    type: 'array'

  before((done) ->
    app = express()

    # Attaching endpoint for each testing scenario
    app.get('/bricks/XYZ42', (req, res) ->
      res.setHeader('Content-Type', 'application/json')
      res.status(200).send(brickTypePayload)
    )
    app.post('/bricks', (req, res) ->
      res.setHeader('Content-Type', 'application/json')
      res.status(200).send(brickTypePayload)
    )
    app.get('/customers', (req, res) ->
      res.setHeader('Content-Type', 'application/json')
      res.status(200).send(userArrayPayload)
    )
    app.post('/customers', (req, res) ->
      res.setHeader('Content-Type', 'application/json')
      res.status(200).send(userPayload)
    )

    # Spinning up the Express server, running Dredd, and saving results
    server = app.listen(PORT, ->
      runDredd('./test/fixtures/regression-319.apib', (err, result) ->
        results = parseOutput(result.stdout)
        server.close(done)
      )
    )
  )

  it('outputs no failures', ->
    # Intentionally not testing just '.length' as this approach will output the difference
    assert.deepEqual(results.failures, [])
  )
  it('results in exactly four tests', ->
    assert.include(results.summary, '4 total')
  )
  it('results in four passing tests', ->
    assert.include(results.summary, '4 passing')
  )

  describe('Attributes defined in resource are referenced from payload [GET /bricks/XYZ42]', ->
    it('has no request body', ->
      assert.isUndefined(results.bodies[0])
    )
    it('has correct ‘expected’ response body', ->
      assert.deepEqual(results.bodies[1], brickTypePayload)
    )
    it('has correct ‘actual’ response body', ->
      assert.deepEqual(results.bodies[2], brickTypePayload)
    )
    it('has correct schema', ->
      assert.deepEqual(results.schemas[0], brickTypeSchema)
    )
  )
  describe('Attributes defined in resource are referenced from action [POST /bricks]', ->
    it('has correct request body', ->
      assert.deepEqual(results.bodies[3], brickTypePayload)
    )
    it('has correct ‘expected’ response body', ->
      assert.deepEqual(results.bodies[4], brickTypePayload)
    )
    it('has correct ‘actual’ response body', ->
      assert.deepEqual(results.bodies[5], brickTypePayload)
    )
    it('has correct schema', ->
      assert.deepEqual(results.schemas[1], brickTypeSchema)
    )
  )
  describe('Attributes defined as data structure are referenced from payload [GET /customers]', ->
    it('has no request body', ->
      assert.isUndefined(results.bodies[6])
    )
    it('has correct ‘expected’ response body', ->
      assert.deepEqual(results.bodies[7], userArrayPayload)
    )
    it('has correct ‘actual’ response body', ->
      assert.deepEqual(results.bodies[8], userArrayPayload)
    )
    it('has correct schema', ->
      assert.deepEqual(results.schemas[2], userArraySchema)
    )
  )
  describe('Attributes defined as data structure are referenced from action [POST /customers]', ->
    it('has correct request body', ->
      assert.deepEqual(results.bodies[9], userPayload)
    )
    it('has correct ‘expected’ response body', ->
      assert.deepEqual(results.bodies[10], userPayload)
    )
    it('has correct ‘actual’ response body', ->
      assert.deepEqual(results.bodies[11], userPayload)
    )
    it('has correct schema', ->
      assert.deepEqual(results.schemas[3], userSchema)
    )
  )
)
