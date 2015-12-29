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
  entries = []
  entry = undefined

  # Parse individual entries (deals also with multi-line entries)
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
  scenarios = [ # TODO missing scenarios
    #   definedIn: 'Resource'
    #   referencedIn: 'Action'
    #   fixture: './test/fixtures/attributes-resource-action.apib'
    # ,
      definedIn: 'Resource'
      referencedIn: 'Payload'
      fixture: './test/fixtures/attributes-resource-payload.apib'
    # ,
    #   definedIn: 'Data Structures'
    #   referencedIn: 'Action'
    #   fixture: './test/fixtures/attributes-datastructures-action.apib'
    # ,
    #   definedIn: 'Data Structures'
    #   referencedIn: 'Payload'
    #   fixture: './test/fixtures/attributes-datastructures-payload.apib'
  ]

  payload =
    id: ''
    name: ''
    colors: ['red', 'brown']
    dimensions: [[20, 30, 40]]

  endpoints = [
    path: '/bricks/XYZ42'
    payload: payload
    schema: # TODO truly correct schema for given payload
      $schema: 'http://json-schema.org/draft-04/schema#'
      type: 'object'
  ,
    path: '/bricks'
    payload: [payload]
    schema: # TODO truly correct schema for given payload
      $schema: 'http://json-schema.org/draft-04/schema#'
      type: 'array'
  ]

  scenarios.forEach((scenario) ->
    describe("Body Attributes from #{scenario.definedIn} are Referenced in #{scenario.referencedIn}", ->
      results = undefined

      before((done) ->
        app = express()

        # Attaching endpoints
        endpoints.forEach((endpoint) ->
          app.get(endpoint.path, (req, res) ->
            res.setHeader('Content-Type', 'application/json')
            res.status(200).send(endpoint.payload)
          )
        )

        # Spinning up the Express server, running Dredd, and saving results
        server = app.listen(PORT, ->
          runDredd(scenario.fixture, (err, result) ->
            results = parseOutput(result.stdout)
            server.close(done)
          )
        )
      )

      it('should output no failures', ->
        # Intentionally not testing just .length as this approach will output
        # the difference
        assert.deepEqual(results.failures, [])
      )
      it('should result in exactly two passing tests', ->
        assert.include(results.summary, '2 passing')
        assert.include(results.summary, '2 total')
      )

      indexes = {
        '/bricks/XYZ42': {expected: 1, actual: 2, schema: 0}
        '/bricks': {expected: 4, actual: 5, schema: 1}
      }
      endpoints.forEach((endpoint) ->
        {expected, actual, schema} = indexes[endpoint.path]

        context("Endpoint '#{endpoint.path}'", ->
          it("has correct 'expected' response body", ->
            assert.deepEqual(results.bodies[expected], endpoint.payload)
          )
          it("has correct 'actual' response body", ->
            # This should ALWAYS pass as we are testing something we actually
            # returned to Dredd in the Express instance above
            assert.deepEqual(results.bodies[actual], endpoint.payload)
          )
          it("has correct schema", ->
            assert.deepEqual(results.schemas[schema], endpoint.schema)
          )
        )
      )
    )
  )
)
