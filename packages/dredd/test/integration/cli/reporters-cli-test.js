import clone from 'clone'
import fs from 'fs'
import { assert } from 'chai'

import { runCLI, createServer, DEFAULT_SERVER_PORT } from '../helpers'

const APIARY_PORT = DEFAULT_SERVER_PORT + 1

describe('CLI - Reporters', () => {
  let server

  before((done) => {
    const app = createServer()

    app.get('/machines', (req, res) =>
      res.json([{ type: 'bulldozer', name: 'willy' }])
    )

    server = app.listen((err) => {
      done(err)
    })
  })

  after((done) => server.close(done))

  describe('when -r/--reporter is provided to use additional reporters', () => {
    let cliInfo
    const args = [
      './test/fixtures/single-get.apib',
      `http://127.0.0.1:${DEFAULT_SERVER_PORT}`,
      '--reporter=nyan'
    ]

    before((done) => {
      runCLI(args, (err, info) => {
        cliInfo = info
        done(err)
      })
    })

    it('should use given reporter', () => {
      // Nyan cat ears should exist in stdout
      assert.include(cliInfo.stdout, '/\\_/\\')
    })
  })

  describe('when apiary reporter is used', () => {
    let apiary
    let apiaryRuntimeInfo

    const env = clone(process.env)
    env.APIARY_API_URL = `http://127.0.0.1:${APIARY_PORT}`

    before((done) => {
      const app = createServer()

      app.post('/apis/*', (req, res) => {
        res.json({
          _id: '1234_id',
          testRunId: '6789_testRunId',
          reportUrl: 'http://example.com/test/run/1234_id'
        })
      })

      app.all('*', (req, res) => res.json({}))

      apiary = app.listen(APIARY_PORT, (err, info) => {
        apiaryRuntimeInfo = info
        done(err)
      })
    })

    after((done) => apiary.close(done))

    describe('when Dredd successfully performs requests to Apiary', () => {
      let cliInfo
      let stepRequest
      const args = [
        './test/fixtures/single-get.apib',
        `http://127.0.0.1:${DEFAULT_SERVER_PORT}`,
        '--reporter=apiary'
      ]

      before((done) => {
        apiaryRuntimeInfo.reset()
        runCLI(args, { env }, (err, info) => {
          cliInfo = info
          stepRequest =
            apiaryRuntimeInfo.requests[
              '/apis/public/tests/steps?testRunId=1234_id'
            ][0]
          done(err)
        })
      })

      it('should print URL of the test report', () =>
        assert.include(cliInfo.stdout, 'http://example.com/test/run/1234_id'))
      it('should print warning about missing Apiary API settings', () =>
        assert.include(
          cliInfo.stdout,
          'Apiary API Key or API Project Name were not provided.'
        ))
      it('should exit with status 0', () => assert.equal(cliInfo.exitStatus, 0))
      it('should perform 3 requests to Apiary', () => {
        assert.deepEqual(apiaryRuntimeInfo.requestCounts, {
          '/apis/public/tests/runs': 1,
          '/apis/public/tests/run/1234_id': 1,
          '/apis/public/tests/steps?testRunId=1234_id': 1
        })
      })
      it('should send results from gavel', () => {
        assert.isObject(stepRequest.body)
        assert.nestedProperty(stepRequest.body, 'results.request')
        assert.nestedProperty(stepRequest.body, 'results.realResponse')
        assert.nestedProperty(stepRequest.body, 'results.expectedResponse')
        assert.nestedProperty(
          stepRequest.body,
          'results.validationResult.fields.body'
        )
        assert.nestedProperty(
          stepRequest.body,
          'results.validationResult.fields.headers'
        )
        assert.nestedProperty(
          stepRequest.body,
          'results.validationResult.fields.statusCode'
        )
      })
    })

    describe('when hooks file uses hooks.log function for logging', () => {
      let cliInfo
      let updateRequest
      let stepRequest
      const args = [
        './test/fixtures/single-get.apib',
        `http://127.0.0.1:${DEFAULT_SERVER_PORT}`,
        '--reporter=apiary',
        '--require=coffeescript/register',
        '--hookfiles=./test/fixtures/hooks-log.coffee'
      ]

      before((done) => {
        apiaryRuntimeInfo.reset()
        runCLI(args, { env }, (err, info) => {
          cliInfo = info
          updateRequest =
            apiaryRuntimeInfo.requests['/apis/public/tests/run/1234_id'][0]
          stepRequest =
            apiaryRuntimeInfo.requests[
              '/apis/public/tests/steps?testRunId=1234_id'
            ][0]
          return done(err)
        })
      })

      it('hooks.log should print also to console', () => {
        assert.include(cliInfo.output, 'using hooks.log to debug')
      })
      it('hooks.log should use toString on objects', () =>
        assert.include(cliInfo.output, 'Error object!'))
      it('should exit with status 0', () => assert.equal(cliInfo.exitStatus, 0))

      it('should request Apiary API to start a test run', () => {
        assert.equal(
          apiaryRuntimeInfo.requestCounts['/apis/public/tests/runs'],
          1
        )
        assert.equal(
          apiaryRuntimeInfo.requests['/apis/public/tests/runs'][0].method,
          'POST'
        )
      })
      it('should request Apiary API to create a test step', () => {
        assert.equal(
          apiaryRuntimeInfo.requestCounts[
            '/apis/public/tests/steps?testRunId=1234_id'
          ],
          1
        )
        assert.equal(
          apiaryRuntimeInfo.requests[
            '/apis/public/tests/steps?testRunId=1234_id'
          ][0].method,
          'POST'
        )
      })
      it('should request Apiary API to update the test run', () => {
        assert.equal(
          apiaryRuntimeInfo.requestCounts['/apis/public/tests/run/1234_id'],
          1
        )
        assert.equal(
          apiaryRuntimeInfo.requests['/apis/public/tests/run/1234_id'][0]
            .method,
          'PATCH'
        )
      })

      context('the update request', () => {
        it('should have result stats with logs', () => {
          assert.isObject(updateRequest.body)
          assert.nestedPropertyVal(updateRequest.body, 'status', 'passed')
          assert.nestedProperty(updateRequest.body, 'endedAt')
          assert.nestedProperty(updateRequest.body, 'logs')
          assert.isArray(updateRequest.body.logs)
          assert.lengthOf(updateRequest.body.logs, 3)
          assert.property(updateRequest.body.logs[0], 'timestamp')
          assert.include(updateRequest.body.logs[0].content, 'Error object!')
          assert.property(updateRequest.body.logs[1], 'timestamp')
          assert.nestedPropertyVal(
            updateRequest.body.logs[1],
            'content',
            'true'
          )
          assert.property(updateRequest.body.logs[2], 'timestamp')
          assert.nestedPropertyVal(
            updateRequest.body.logs[2],
            'content',
            'using hooks.log to debug'
          )
          assert.nestedProperty(updateRequest.body, 'result.tests')
          assert.nestedProperty(updateRequest.body, 'result.failures')
          assert.nestedProperty(updateRequest.body, 'result.errors')
          assert.nestedProperty(updateRequest.body, 'result.passes')
          assert.nestedProperty(updateRequest.body, 'result.start')
          assert.nestedProperty(updateRequest.body, 'result.end')
        })
        it("should have startedAt larger than 'before' hook log timestamp", () => {
          assert.isObject(stepRequest.body)
          assert.isNumber(stepRequest.body.startedAt)
          assert.operator(
            stepRequest.body.startedAt,
            '>=',
            updateRequest.body.logs[0].timestamp
          )
          assert.operator(
            stepRequest.body.startedAt,
            '>=',
            updateRequest.body.logs[1].timestamp
          )
        })
        it("should have startedAt smaller than 'after' hook log timestamp", () => {
          assert.isObject(stepRequest.body)
          assert.isNumber(stepRequest.body.startedAt)
          assert.operator(
            stepRequest.body.startedAt,
            '<=',
            updateRequest.body.logs[2].timestamp
          )
        })
      })
    })
  })

  describe('when -o/--output is used to specify output file', () => {
    const args = [
      './test/fixtures/single-get.apib',
      `http://127.0.0.1:${DEFAULT_SERVER_PORT}`,
      '--reporter=xunit',
      '--output=__test_file_output__.xml'
    ]

    before((done) =>
      runCLI(args, (err) => {
        done(err)
      })
    )

    after(() => fs.unlinkSync(`${process.cwd()}/__test_file_output__.xml`))

    it('should create given file', () =>
      assert.isOk(fs.existsSync(`${process.cwd()}/__test_file_output__.xml`)))
  })

  describe('when -o/--output is used multiple times to specify output files', () => {
    const args = [
      './test/fixtures/single-get.apib',
      `http://127.0.0.1:${DEFAULT_SERVER_PORT}`,
      '--reporter=xunit',
      '--output=__test_file_output1__.xml',
      '--reporter=xunit',
      '--output=__test_file_output2__.xml'
    ]

    before((done) =>
      runCLI(args, (err) => {
        done(err)
      })
    )

    after(() => {
      fs.unlinkSync(`${process.cwd()}/__test_file_output1__.xml`)
      fs.unlinkSync(`${process.cwd()}/__test_file_output2__.xml`)
    })

    it('should create given files', () => {
      assert.isOk(fs.existsSync(`${process.cwd()}/__test_file_output1__.xml`))
      assert.isOk(fs.existsSync(`${process.cwd()}/__test_file_output2__.xml`))
    })
  })

  describe('when -o/--output is used to specify output file but directory is not existent', () => {
    const args = [
      './test/fixtures/single-get.apib',
      `http://127.0.0.1:${DEFAULT_SERVER_PORT}`,
      '--reporter=xunit',
      '--output=./__test_directory/__test_file_output__.xml'
    ]

    before((done) => {
      try {
        fs.unlinkSync(
          `${process.cwd()}/__test_directory/__test_file_output__.xml`
        )
      } catch (error) {
        // Do nothing
      }

      runCLI(args, (err) => {
        done(err)
      })
    })

    after(() => {
      fs.unlinkSync(
        `${process.cwd()}/__test_directory/__test_file_output__.xml`
      )
      fs.rmdirSync(`${process.cwd()}/__test_directory`)
    })

    it('should create given file', () =>
      assert.isOk(
        fs.existsSync(
          `${process.cwd()}/__test_directory/__test_file_output__.xml`
        )
      ))
  })

  describe("when the 'apiary' reporter fails", () => {
    let apiaryApiUrl
    let cliInfo
    const args = [
      './test/fixtures/single-get.apib',
      `http://127.0.0.1:${DEFAULT_SERVER_PORT}`,
      '--reporter=apiary'
    ]

    before((done) => {
      apiaryApiUrl = process.env.APIARY_API_URL

      const nonExistentPort = DEFAULT_SERVER_PORT + 42
      process.env.APIARY_API_URL = `http://127.0.0.1:${nonExistentPort}`

      runCLI(args, (err, info) => {
        cliInfo = info
        done(err)
      })
    })
    after(() => {
      process.env.APIARY_API_URL = apiaryApiUrl
    })

    it('ends successfully', () => assert.equal(cliInfo.exitStatus, 0))
    it('prints error about Apiary API connection issues', () =>
      assert.include(
        cliInfo.stderr,
        'Apiary reporter could not connect to Apiary API'
      ))
  })
})
