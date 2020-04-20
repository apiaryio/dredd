import clone from 'clone'
import { assert } from 'chai'

import { runCLIWithServer, createServer, DEFAULT_SERVER_PORT } from '../helpers'

// Helper, tries to parse given HTTP body and in case it can be parsed as JSON,
// it returns the resulting JS object, otherwise it returns whatever came in.
function parseIfJson(body) {
  if (!body) {
    return undefined
  }
  try {
    return JSON.parse(body)
  } catch (error) {
    return body
  }
}

// This can be removed once https://github.com/apiaryio/dredd/issues/341 is done
function parseDreddStdout(stdout) {
  // Parse individual entries (deals also with multi-line entries)
  let entries = []
  let entry
  for (const line of stdout.split(/\r?\n/)) {
    const match = line.match(/^(\w+): (.+)?$/)
    if (match) {
      if (entry) {
        entry.body = entry.body.trim()
        entries.push(entry)
      }
      entry = { label: match[1], body: match[2] || '' }
    } else {
      entry.body += `\n${line.trim()}`
    }
  }

  // Correction of following situation:
  //
  // fail: POST /customers duration: 13ms
  // fail: body: At '/name' Invalid type: null (expected string)
  // body: At '/shoeSize' Invalid type: string (expected number)
  entries = entries.filter((item, i) => {
    const previousEntry = entries[i - 1]
    if (item.label === 'body' && previousEntry.label === 'fail') {
      previousEntry.body += `\n${item.body}`
      return false
    }
    return true
  })

  // Re-arrange data from entries
  const results = {
    summary: '',
    failures: [],
    bodies: [],
    schemas: []
  }
  for (entry of entries) {
    switch (entry.label) {
      case 'body':
        results.bodies.push(parseIfJson(entry.body))
        break
      case 'bodySchema':
        results.schemas.push(parseIfJson(entry.body))
        break
      case 'complete':
        results.summary = entry.body
        break
      case 'fail':
        results.failures.push(entry.body)
        break
      default:
        continue
    }
  }
  return results
}

describe('Regression: Issues #319 and #354', () => {
  let results

  const brickTypePayload = {
    id: '',
    name: '',
    colors: ['red', 'brown'],
    dimensions: [[20, 30, 40]],
    producer: {
      address: {
        city: null,
        street: ''
      }
    }
  }

  const brickTypeSchema = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      id: { type: 'string' },
      name: { type: 'string' },
      colors: { type: 'array' },
      dimensions: { type: 'array' },
      producer: {
        type: 'object',
        properties: {
          address: {
            type: 'object',
            properties: {
              city: {
                anyOf: [{ type: 'null' }, { type: 'string' }]
              },
              street: { type: 'string' }
            }
          }
        }
      }
    },
    required: ['name']
  }

  const userPayload = {
    id: '',
    name: '',
    shoeSize: 42,
    address: {
      city: null,
      street: ''
    }
  }

  const userSchema = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      id: { type: 'string' },
      name: { type: 'string' },
      shoeSize: { type: 'number' },
      address: {
        type: 'object',
        properties: {
          city: {
            anyOf: [{ type: 'null' }, { type: 'string' }]
          },
          street: { type: 'string' }
        }
      }
    }
  }

  const userArrayPayload = [userPayload]

  const userArraySchema = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'array'
  }

  describe('Tested app is consistent with the API description', () => {
    before((done) => {
      const app = createServer()

      // Attaching endpoint for each testing scenario
      app.get('/bricks/XYZ42', (req, res) => res.json(brickTypePayload))
      app.post('/bricks', (req, res) => res.json(brickTypePayload))
      app.get('/customers', (req, res) => res.json(userArrayPayload))
      app.post('/customers', (req, res) => res.json(userPayload))

      // Spinning up the Express server, running Dredd, and saving results
      const args = [
        './test/fixtures/regression-319-354.apib',
        `http://127.0.0.1:${DEFAULT_SERVER_PORT}`,
        '--inline-errors',
        '--details',
        '--no-color'
      ]
      runCLIWithServer(args, app, (err, info) => {
        if (info) {
          results = parseDreddStdout(info.dredd.stdout)
        }
        done(err)
      })
    })

    it('outputs no failures', () => {
      // Intentionally not testing just '.length' as this approach will output the difference
      assert.deepEqual(results.failures, [])
    })
    it('results in exactly four tests', () =>
      assert.include(results.summary, '4 total'))
    it('results in four passing tests', () =>
      assert.include(results.summary, '4 passing'))

    describe('Attributes defined in resource are referenced from payload [GET /bricks/XYZ42]', () => {
      it('has no request body', () => assert.isUndefined(results.bodies[0]))
      it('has correct ‘expected’ response body', () =>
        assert.deepEqual(results.bodies[1], brickTypePayload))
      it('has correct ‘actual’ response body', () =>
        assert.deepEqual(results.bodies[2], brickTypePayload))
      it('has correct schema', () =>
        assert.deepEqual(results.schemas[0], brickTypeSchema))
    })

    describe('Attributes defined in resource are referenced from action [POST /bricks]', () => {
      it('has correct request body', () =>
        assert.deepEqual(results.bodies[3], brickTypePayload))
      it('has correct ‘expected’ response body', () =>
        assert.deepEqual(results.bodies[4], brickTypePayload))
      it('has correct ‘actual’ response body', () =>
        assert.deepEqual(results.bodies[5], brickTypePayload))
      it('has correct schema', () =>
        assert.deepEqual(results.schemas[1], brickTypeSchema))
    })

    describe('Attributes defined as data structure are referenced from payload [GET /customers]', () => {
      it('has no request body', () => assert.isUndefined(results.bodies[6]))
      it('has correct ‘expected’ response body', () =>
        assert.deepEqual(results.bodies[7], userArrayPayload))
      it('has correct ‘actual’ response body', () =>
        assert.deepEqual(results.bodies[8], userArrayPayload))
      it('has correct schema', () =>
        assert.deepEqual(results.schemas[2], userArraySchema))
    })

    describe('Attributes defined as data structure are referenced from action [POST /customers]', () => {
      it('has correct request body', () =>
        assert.deepEqual(results.bodies[9], userPayload))
      it('has correct ‘expected’ response body', () =>
        assert.deepEqual(results.bodies[10], userPayload))
      it('has correct ‘actual’ response body', () =>
        assert.deepEqual(results.bodies[11], userPayload))
      it('has correct schema', () =>
        assert.deepEqual(results.schemas[3], userSchema))
    })
  })

  describe('Tested app is inconsistent with the API description', () => {
    const incorrectBrickTypePayload = clone(brickTypePayload)
    incorrectBrickTypePayload.id = 42
    delete incorrectBrickTypePayload.name

    const incorrectUserPayload = clone(userPayload)
    incorrectUserPayload.shoeSize = 'XL'
    incorrectUserPayload.name = null

    const incorrectUserArrayPayload = {
      page: 1,
      items: [incorrectUserPayload]
    }

    before((done) => {
      const app = createServer()

      // Attaching endpoint for each testing scenario
      app.get('/bricks/XYZ42', (req, res) =>
        res.json(incorrectBrickTypePayload)
      )
      app.post('/bricks', (req, res) => res.json(incorrectBrickTypePayload))
      app.get('/customers', (req, res) => res.json(incorrectUserArrayPayload))
      app.post('/customers', (req, res) => res.json(incorrectUserPayload))

      // Spinning up the Express server, running Dredd, and saving results
      const args = [
        './test/fixtures/regression-319-354.apib',
        `http://127.0.0.1:${DEFAULT_SERVER_PORT}`,
        '--inline-errors',
        '--details',
        '--no-color'
      ]
      runCLIWithServer(args, app, (err, info) => {
        if (info) {
          results = parseDreddStdout(info.dredd.stdout)
        }
        done(err)
      })
    })

    it('outputs failures', () => assert.isOk(results.failures.length))
    it('results in exactly four tests', () =>
      assert.include(results.summary, '4 total'))
    it('results in four failing tests', () =>
      assert.include(results.summary, '4 failing'))

    describe('Attributes defined in resource are referenced from payload [GET /bricks/XYZ42]', () => {
      it('fails on missing required property and invalid type', () => {
        assert.include(results.failures[0], 'GET (200) /bricks/XYZ42')
        assert.include(results.failures[1], 'Missing required property: name')
        assert.include(results.failures[1], 'Invalid type: number')
      })
      it('has no request body', () => assert.isUndefined(results.bodies[0]))
      it('has correct ‘expected’ response body', () =>
        assert.deepEqual(results.bodies[1], brickTypePayload))
      it('has incorrect ‘actual’ response body', () =>
        assert.deepEqual(results.bodies[2], incorrectBrickTypePayload))
      it('has correct schema', () =>
        assert.deepEqual(results.schemas[0], brickTypeSchema))
    })

    describe('Attributes defined in resource are referenced from action [POST /bricks]', () => {
      it('fails on missing required property and invalid type', () => {
        assert.include(results.failures[2], 'POST (200) /bricks')
        assert.include(results.failures[3], 'Missing required property: name')
        assert.include(results.failures[3], 'Invalid type: number')
      })
      it('has correct request body', () =>
        assert.deepEqual(results.bodies[3], brickTypePayload))
      it('has correct ‘expected’ response body', () =>
        assert.deepEqual(results.bodies[4], brickTypePayload))
      it('has incorrect ‘actual’ response body', () =>
        assert.deepEqual(results.bodies[5], incorrectBrickTypePayload))
      it('has correct schema', () =>
        assert.deepEqual(results.schemas[1], brickTypeSchema))
    })

    describe('Attributes defined as data structure are referenced from payload [GET /customers]', () => {
      it('fails on invalid type', () => {
        assert.include(results.failures[4], 'GET (200) /customers')
        assert.include(results.failures[5], 'Invalid type: object')
      })
      it('has no request body', () => assert.isUndefined(results.bodies[6]))
      it('has correct ‘expected’ response body', () =>
        assert.deepEqual(results.bodies[7], userArrayPayload))
      it('has incorrect ‘actual’ response body', () =>
        assert.deepEqual(results.bodies[8], incorrectUserArrayPayload))
      it('has correct schema', () =>
        assert.deepEqual(results.schemas[2], userArraySchema))
    })

    describe('Attributes defined as data structure are referenced from action [POST /customers]', () => {
      it('fails on invalid types', () => {
        assert.include(results.failures[6], 'POST (200) /customers')
        assert.include(results.failures[7], 'Invalid type: null')
        assert.include(results.failures[7], 'Invalid type: string')
      })
      it('has correct request body', () =>
        assert.deepEqual(results.bodies[9], userPayload))
      it('has correct ‘expected’ response body', () =>
        assert.deepEqual(results.bodies[10], userPayload))
      it('has incorrect ‘actual’ response body', () =>
        assert.deepEqual(results.bodies[11], incorrectUserPayload))
      it('has correct schema', () =>
        assert.deepEqual(results.schemas[3], userSchema))
    })
  })
})
