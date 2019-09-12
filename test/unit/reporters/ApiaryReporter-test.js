import clone from 'clone'
import nock from 'nock'
import proxyquire from 'proxyquire'
import sinon from 'sinon'
import { assert } from 'chai'
import { EventEmitter } from 'events'

import apiDescriptions from '../../fixtures/apiDescriptions'
import loggerStub from '../../../lib/logger'
import reporterOutputLoggerStub from '../../../lib/reporters/reporterOutputLogger'

const ApiaryReporter = proxyquire('../../../lib/reporters/ApiaryReporter', {
  '../logger': loggerStub,
  './reporterOutputLogger': reporterOutputLoggerStub
}).default

const PORT = 9876
nock.enableNetConnect()

describe('ApiaryReporter', () => {
  let env = {}
  beforeEach(() => {
    sinon.stub(loggerStub, 'debug')
    sinon.stub(reporterOutputLoggerStub, 'complete')
  })

  afterEach(() => {
    sinon.stub(loggerStub.debug.restore())
    sinon.stub(reporterOutputLoggerStub.complete.restore())
  })

  before(() => nock.disableNetConnect())

  after(() => nock.enableNetConnect())

  describe('without API key or without suite', () => {
    let test = {}
    let emitter = {}

    beforeEach((done) => {
      emitter = new EventEmitter()
      env = { CIRCLE_VARIABLE: 'CIRCLE_VALUE' }
      env.APIARY_API_URL = `https://127.0.0.1:${PORT}`
      delete env.APIARY_API_KEY
      delete env.APIARY_API_NAME

      test = {
        status: 'fail',
        title: 'POST /machines',
        message:
          "headers: Value of the ‘content-type’ must be application/json.\nbody: No validator found for real data media type 'text/plain' and expected data media type 'application/json'.\nstatusCode: Real and expected data does not match.\n",

        startedAt: 1234567890 * 1000, // JavaScript Date.now() timestamp (UNIX-like timestamp * 1000 precision)

        origin: {
          filename: './test/fixtures/multifile/greeting.apib',
          apiName: 'Greeting API',
          resourceGroupName: '',
          resourceName: '/greeting',
          actionName: 'GET',
          exampleName: ''
        },

        actual: {
          statusCode: 400,
          headers: {
            'content-type': 'text/plain'
          },

          body: 'Foo bar'
        },

        expected: {
          headers: {
            'content-type': 'application/json'
          },

          body:
            '{\n  "type": "bulldozer",\n  "name": "willy",\n  "id": "5229c6e8e4b0bd7dbb07e29c"\n}\n',
          status: '202'
        },

        request: {
          body: '{\n  "type": "bulldozer",\n  "name": "willy"}\n',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Dredd/0.2.1 (Darwin 13.0.0; x64)',
            'Content-Length': 44
          },

          uri: '/machines',
          method: 'POST'
        },

        results: {
          headers: {
            results: [
              {
                pointer: '/content-type',
                severity: 'error',
                message: 'Value of the ‘content-type’ must be application/json.'
              }
            ],
            realType: 'application/vnd.apiary.http-headers+json',
            expectedType: 'application/vnd.apiary.http-headers+json',
            validator: 'HeadersJsonExample',
            rawData: {
              0: {
                property: ['content-type'],
                propertyValue: 'text/plain',
                attributeName: 'enum',
                attributeValue: ['application/json'],
                message:
                  'Value of the ‘content-type’ must be application/json.',
                validator: 'enum',
                validatorName: 'enum',
                validatorValue: ['application/json']
              },

              length: 1
            }
          },

          body: {
            results: [
              {
                message:
                  "No validator found for real data media type 'text/plain' and expected data media type 'application/json'.",
                severity: 'error'
              }
            ],
            realType: 'text/plain',
            expectedType: 'application/json',
            validator: null,
            rawData: null
          },

          statusCode: {
            realType: 'text/vnd.apiary.status-code',
            expectedType: 'text/vnd.apiary.status-code',
            validator: 'TextDiff',
            rawData: '@@ -1,3 +1,9 @@\n-400\n+undefined\n',
            results: [
              {
                severity: 'error',
                message: 'Real and expected data does not match.'
              }
            ]
          }
        }
      }

      nock.disableNetConnect()

      done()
    })

    afterEach((done) => {
      nock.enableNetConnect()
      nock.cleanAll()
      done()
    })

    describe('constructor', () => {
      describe('when custom settings contain API URL without trailing slash', () => {
        const custom = {
          apiaryReporterEnv: env,
          apiaryApiUrl: 'https://api.example.com:1234'
        }

        it('uses the provided API URL in configuration', () => {
          emitter = new EventEmitter()
          const apiaryReporter = new ApiaryReporter(emitter, {}, { custom })
          assert.equal(
            apiaryReporter.configuration.apiUrl,
            'https://api.example.com:1234'
          )
        })
      })

      describe('when custom settings contain API URL with trailing slash', () => {
        const custom = {
          apiaryReporterEnv: env,
          apiaryApiUrl: 'https://api.example.com:1234/'
        }

        it('uses the provided API URL in configuration, without trailing slash', () => {
          emitter = new EventEmitter()
          const apiaryReporter = new ApiaryReporter(emitter, {}, { custom })
          assert.equal(
            apiaryReporter.configuration.apiUrl,
            'https://api.example.com:1234'
          )
        })
      })
    })

    describe('_performRequestAsync', () => {
      describe('when custom settings contain API URL without trailing slash', () => {
        const custom = {
          apiaryReporterEnv: env,
          apiaryApiUrl: 'https://api.example.com:1234'
        }

        it('should use API URL without double slashes', (done) => {
          emitter = new EventEmitter()
          const apiaryReporter = new ApiaryReporter(emitter, {}, { custom })
          apiaryReporter._performRequestAsync('/', 'POST', '', () => {
            assert.isOk(
              loggerStub.debug.calledWithMatch(
                'POST https://api.example.com:1234/ (without body)'
              )
            )
            done()
          })
        })
      })

      describe('when custom settings contain API URL with trailing slash', () => {
        const custom = {
          apiaryReporterEnv: env,
          apiaryApiUrl: 'https://api.example.com:1234/'
        }

        describe('when provided with root path', () =>
          it('should use API URL without double slashes', (done) => {
            emitter = new EventEmitter()
            const apiaryReporter = new ApiaryReporter(emitter, {}, { custom })
            apiaryReporter._performRequestAsync('/', 'POST', '', () => {
              assert.isOk(
                loggerStub.debug.calledWithMatch(
                  'POST https://api.example.com:1234/ (without body)'
                )
              )
              done()
            })
          }))

        describe('when provided with non-root path', () =>
          it('should use API URL without double slashes', (done) => {
            emitter = new EventEmitter()
            const apiaryReporter = new ApiaryReporter(emitter, {}, { custom })
            apiaryReporter._performRequestAsync(
              '/hello?q=1',
              'POST',
              '',
              () => {
                assert.isOk(
                  loggerStub.debug.calledWithMatch(
                    'POST https://api.example.com:1234/hello?q=1 (without body)'
                  )
                )
                done()
              }
            )
          }))
      })

      describe('when server is not available', () => {
        beforeEach(() => {
          nock.enableNetConnect()
          nock.cleanAll()
        })

        it('should log human readable message', (done) => {
          emitter = new EventEmitter()
          const apiaryReporter = new ApiaryReporter(
            emitter,
            {},
            { custom: { apiaryReporterEnv: env } }
          )
          apiaryReporter._performRequestAsync('/', 'POST', '', (error) => {
            assert.isNotNull(error)
            done()
          })
        })

        it('should set server error to true', (done) => {
          emitter = new EventEmitter()
          const apiaryReporter = new ApiaryReporter(
            emitter,
            {},
            { custom: { apiaryReporterEnv: env } }
          )
          apiaryReporter._performRequestAsync('/', 'POST', '', () => {
            assert.isTrue(apiaryReporter.serverError)
            done()
          })
        })
      })
    })

    describe('when starting', () => {
      let call = null
      const runId = '507f1f77bcf86cd799439011'
      let requestBody = null
      beforeEach(() => {
        requestBody = null
        const uri = '/apis/public/tests/runs'
        const reportUrl = 'https://absolutely.fancy.url/wich-can-change/some/id'

        // This is a hack how to get access to the performed request from nock
        // nock isn't able to provide it
        function getBody(body) {
          requestBody = body
          return body
        }

        call = nock(env.APIARY_API_URL)
          .filteringRequestBody(getBody)
          .post(uri)
          .reply(201, JSON.stringify({ _id: runId, reportUrl }))
      })

      it('should set uuid', (done) => {
        emitter = new EventEmitter()
        const apiaryReporter = new ApiaryReporter(
          emitter,
          {},
          { custom: { apiaryReporterEnv: env } }
        )
        return emitter.emit('start', apiDescriptions, () => {
          assert.isNotNull(apiaryReporter.uuid)
          return done()
        })
      })

      it('should set start time', (done) => {
        emitter = new EventEmitter()
        const apiaryReporter = new ApiaryReporter(
          emitter,
          {},
          { custom: { apiaryReporterEnv: env } }
        )
        emitter.emit('start', apiDescriptions, () => {
          assert.isNotNull(apiaryReporter.startedAt)
          done()
        })
      })

      it('should call "create new test run" HTTP resource', (done) => {
        emitter = new EventEmitter()
        new ApiaryReporter(emitter, {}, { custom: { apiaryReporterEnv: env } })
        emitter.emit('start', apiDescriptions, () => {
          assert.isTrue(call.isDone())
          done()
        })
      })

      it('should attach test run ID back to the reporter as remoteId', (done) => {
        emitter = new EventEmitter()
        const apiaryReporter = new ApiaryReporter(
          emitter,
          {},
          { custom: { apiaryReporterEnv: env } }
        )
        emitter.emit('start', apiDescriptions, () => {
          assert.isNotNull(apiaryReporter.remoteId)
          done()
        })
      })

      it('should attach test run reportUrl to the reporter as reportUrl', (done) => {
        emitter = new EventEmitter()
        const apiaryReporter = new ApiaryReporter(
          emitter,
          {},
          { custom: { apiaryReporterEnv: env } }
        )
        emitter.emit('start', apiDescriptions, () => {
          assert.isNotNull(apiaryReporter.reportUrl)
          done()
        })
      })

      it('should have blueprints key in the request and it should be an array and members should have proper structure', (done) => {
        emitter = new EventEmitter()
        new ApiaryReporter(emitter, {}, { custom: { apiaryReporterEnv: env } })
        emitter.emit('start', apiDescriptions, () => {
          const parsedBody = JSON.parse(requestBody)
          assert.isArray(parsedBody.blueprints)
          assert.lengthOf(parsedBody.blueprints, 1)
          for (const blueprint of parsedBody.blueprints) {
            assert.property(blueprint, 'raw')
            assert.propertyVal(
              blueprint,
              'raw',
              'FORMAT: 1A\n\n# Machines API\n\n# Group Machines\n\n# Machines collection [/machines/{id}]\n  + Parameters\n    - id (number, `1`)\n\n## Get Machines [GET]\n\n- Request (application/json)\n  + Parameters\n    - id (number, `2`)\n\n- Response 200 (application/json; charset=utf-8)\n\n    [\n      {\n        "type": "bulldozer",\n        "name": "willy"\n      }\n    ]\n\n- Request (application/json)\n  + Parameters\n    - id (number, `3`)\n\n- Response 200 (application/json; charset=utf-8)\n\n    [\n      {\n        "type": "bulldozer",\n        "name": "willy"\n      }\n    ]\n'
            )
            assert.property(blueprint, 'filename')
            assert.propertyVal(
              blueprint,
              'filename',
              './test/fixtures/multiple-examples.apib'
            )
            assert.property(blueprint, 'annotations')
            assert.isArray(blueprint.annotations)
          }
          done()
        })
      })

      it('should have various needed keys in test-run payload sent to apiary', (done) => {
        emitter = new EventEmitter()
        new ApiaryReporter(
          emitter,
          {},
          {
            server: 'http://my.server.co:8080',
            custom: { apiaryReporterEnv: env }
          }
        )
        emitter.emit('start', apiDescriptions, () => {
          const parsedBody = JSON.parse(requestBody)
          assert.propertyVal(parsedBody, 'endpoint', 'http://my.server.co:8080')
          done()
        })
      })

      it('should send the test-run as public one', (done) => {
        emitter = new EventEmitter()
        new ApiaryReporter(
          emitter,
          {},
          {
            server: 'http://my.server.co:8080',
            custom: { apiaryReporterEnv: env }
          }
        )
        emitter.emit('start', apiDescriptions, () => {
          const parsedBody = JSON.parse(requestBody)
          assert.strictEqual(parsedBody.public, true)
          done()
        })
      })

      describe('serverError is true', () =>
        it('should not do anything', (done) => {
          emitter = new EventEmitter()
          const apiaryReporter = new ApiaryReporter(
            emitter,
            {},
            { custom: { apiaryReporterEnv: env } }
          )
          apiaryReporter.serverError = true
          emitter.emit('start', apiDescriptions, () => {
            assert.isFalse(call.isDone())
            done()
          })
        }))
    })

    describe('when adding passing test', () => {
      let call = null
      const runId = '507f1f77bcf86cd799439011'
      test = null
      let requestBody = null

      beforeEach(() => {
        const uri = `/apis/public/tests/steps?testRunId=${runId}`

        // This is a hack how to get access to the performed request from nock
        // nock isn't able to provide it
        function getBody(body) {
          requestBody = body
          return body
        }

        call = nock(env.APIARY_API_URL)
          .filteringRequestBody(getBody)
          .post(uri)
          .reply(201, { _id: runId })
      })

      it('should call "create new test step" HTTP resource', (done) => {
        emitter = new EventEmitter()
        const apiaryReporter = new ApiaryReporter(
          emitter,
          {},
          { custom: { apiaryReporterEnv: env } }
        )
        apiaryReporter.remoteId = runId
        emitter.emit('test pass', test, () => {
          assert.isTrue(call.isDone())
          done()
        })
      })

      it('should have origin with filename in the request', (done) => {
        emitter = new EventEmitter()
        const apiaryReporter = new ApiaryReporter(
          emitter,
          {},
          { custom: { apiaryReporterEnv: env } }
        )
        apiaryReporter.remoteId = runId
        emitter.emit('test pass', test, () => {
          const parsedBody = JSON.parse(requestBody)
          assert.property(parsedBody.origin, 'filename')
          done()
        })
      })

      it('should have startedAt timestamp in the request', (done) => {
        emitter = new EventEmitter()
        const apiaryReporter = new ApiaryReporter(
          emitter,
          {},
          { custom: { apiaryReporterEnv: env } }
        )
        apiaryReporter.remoteId = runId
        emitter.emit('test pass', test, () => {
          const parsedBody = JSON.parse(requestBody)
          assert.propertyVal(parsedBody, 'startedAt', 1234567890 * 1000)
          done()
        })
      })

      describe('serverError is true', () =>
        it('should not do anything', (done) => {
          emitter = new EventEmitter()
          const apiaryReporter = new ApiaryReporter(
            emitter,
            {},
            { custom: { apiaryReporterEnv: env } }
          )
          apiaryReporter.remoteId = runId
          apiaryReporter.serverError = true
          emitter.emit('test pass', test, () => {
            assert.isFalse(call.isDone())
            done()
          })
        }))
    })

    describe('when adding failing test', () => {
      let call = null
      const runId = '507f1f77bcf86cd799439011'
      test = null

      beforeEach(() => {
        const uri = `/apis/public/tests/steps?testRunId=${runId}`
        call = nock(env.APIARY_API_URL)
          .post(uri)
          .reply(201, { _id: runId })
      })

      it('should call "create new test step" HTTP resource', (done) => {
        emitter = new EventEmitter()
        const apiaryReporter = new ApiaryReporter(
          emitter,
          {},
          { custom: { apiaryReporterEnv: env } }
        )
        apiaryReporter.remoteId = runId
        emitter.emit('test fail', test, () => {
          assert.isTrue(call.isDone())
          done()
        })
      })

      describe('when serverError is true', () =>
        it('should not do anything', (done) => {
          emitter = new EventEmitter()
          const apiaryReporter = new ApiaryReporter(
            emitter,
            {},
            { custom: { apiaryReporterEnv: env } }
          )
          apiaryReporter.remoteId = runId
          apiaryReporter.serverError = true
          emitter.emit('test fail', test, () => {
            assert.isFalse(call.isDone())
            done()
          })
        }))
    })

    describe('when adding skipped test', () => {
      let call = null
      const runId = '507f1f77bcf86cd799439011'
      let clonedTest = null
      let requestBody = null

      beforeEach(() => {
        clonedTest = clone(test)
        clonedTest.status = 'skip'

        const uri = `/apis/public/tests/steps?testRunId=${runId}`

        // This is a hack how to get access to the performed request from nock
        // nock isn't able to provide it
        function getBody(body) {
          requestBody = body
          return body
        }

        call = nock(env.APIARY_API_URL)
          .filteringRequestBody(getBody)
          .post(uri)
          .reply(201, { _id: runId })
      })

      it('should call "create new test step" HTTP resource', (done) => {
        emitter = new EventEmitter()
        const apiaryReporter = new ApiaryReporter(
          emitter,
          {},
          { custom: { apiaryReporterEnv: env } }
        )
        apiaryReporter.remoteId = runId
        emitter.emit('test skip', clonedTest, () => {
          assert.isTrue(call.isDone())
          done()
        })
      })

      it('should send status skipped', (done) => {
        emitter = new EventEmitter()
        const apiaryReporter = new ApiaryReporter(
          emitter,
          {},
          { custom: { apiaryReporterEnv: env } }
        )
        apiaryReporter.remoteId = runId
        emitter.emit('test skip', clonedTest, () => {
          assert.equal(JSON.parse(requestBody).result, 'skip')
          done()
        })
      })

      describe('when serverError is true', () =>
        it('should not do anything', (done) => {
          emitter = new EventEmitter()
          const apiaryReporter = new ApiaryReporter(
            emitter,
            {},
            { custom: { apiaryReporterEnv: env } }
          )
          apiaryReporter.remoteId = runId
          apiaryReporter.serverError = true
          emitter.emit('test skip', clonedTest, () => {
            assert.isFalse(call.isDone())
            done()
          })
        }))
    })

    describe('when adding test with error', () => {
      let call = null
      const runId = '507f1f77bcf86cd799439011'
      test = null
      let requestBody = null

      beforeEach(() => {
        const uri = `/apis/public/tests/steps?testRunId=${runId}`

        test.status = 'error'

        // This is a hack how to get access to the performed request from nock
        // nock isn't able to provide it
        function getBody(body) {
          requestBody = body
          return body
        }

        call = nock(env.APIARY_API_URL)
          .filteringRequestBody(getBody)
          .post(uri)
          .reply(201, { _id: runId })
      })

      const connectionErrors = [
        'ECONNRESET',
        'ENOTFOUND',
        'ESOCKETTIMEDOUT',
        'ETIMEDOUT',
        'ECONNREFUSED',
        'EHOSTUNREACH',
        'EPIPE'
      ]

      connectionErrors.forEach((errType) => {
        describe(`when error type is ${errType}`, () => {
          it('should call "create new test step" HTTP resource', (done) => {
            emitter = new EventEmitter()
            const apiaryReporter = new ApiaryReporter(
              emitter,
              {},
              { custom: { apiaryReporterEnv: env } }
            )
            apiaryReporter.remoteId = runId
            const error = new Error('some error')
            error.code = errType
            emitter.emit('test error', error, test, () => {
              assert.isTrue(call.isDone())
              done()
            })
          })

          it('should set result to error', (done) => {
            emitter = new EventEmitter()
            const apiaryReporter = new ApiaryReporter(
              emitter,
              {},
              { custom: { apiaryReporterEnv: env } }
            )
            apiaryReporter.remoteId = runId
            const error = new Error('some error')
            error.code = errType
            emitter.emit('test error', error, test, () => {
              assert.equal(JSON.parse(requestBody).result, 'error')
              done()
            })
          })

          it('should set error message', (done) => {
            emitter = new EventEmitter()
            const apiaryReporter = new ApiaryReporter(
              emitter,
              {},
              { custom: { apiaryReporterEnv: env } }
            )
            apiaryReporter.remoteId = runId
            const error = new Error('some error')
            error.code = errType
            emitter.emit('test error', error, test, () => {
              assert.isArray(JSON.parse(requestBody).results.errors)
              assert.include(
                JSON.parse(requestBody)
                  .results.errors.map((value) => JSON.stringify(value))
                  .join(),
                'Error connecting to server under test!'
              )
              done()
            })
          })
        })
      })

      describe('when any other error', () => {
        it('should call "create new test step" HTTP resource', (done) => {
          emitter = new EventEmitter()
          const apiaryReporter = new ApiaryReporter(
            emitter,
            {},
            { custom: { apiaryReporterEnv: env } }
          )
          apiaryReporter.remoteId = runId
          const error = new Error('some error')
          emitter.emit('test error', error, test, () => {
            assert.isTrue(call.isDone())
            done()
          })
        })

        it('should set result to error', (done) => {
          emitter = new EventEmitter()
          const apiaryReporter = new ApiaryReporter(
            emitter,
            {},
            { custom: { apiaryReporterEnv: env } }
          )
          apiaryReporter.remoteId = runId
          const error = new Error('some error')
          emitter.emit('test error', error, test, () => {
            assert.equal(JSON.parse(requestBody).result, 'error')
            done()
          })
        })

        it('should set descriptive error', (done) => {
          emitter = new EventEmitter()
          const apiaryReporter = new ApiaryReporter(
            emitter,
            {},
            { custom: { apiaryReporterEnv: env } }
          )
          apiaryReporter.remoteId = runId
          const error = new Error('some error')
          emitter.emit('test error', error, test, () => {
            assert.isArray(JSON.parse(requestBody).results.errors)
            assert.include(
              JSON.parse(requestBody)
                .results.errors.map((value) => JSON.stringify(value))
                .join(),
              'Unhandled error occured when executing the transaction.'
            )
            done()
          })
        })
      })

      describe('when serverError is true', () =>
        it('should not do anything', (done) => {
          emitter = new EventEmitter()
          const apiaryReporter = new ApiaryReporter(
            emitter,
            {},
            { custom: { apiaryReporterEnv: env } }
          )
          apiaryReporter.remoteId = runId
          apiaryReporter.serverError = true
          const error = new Error('some error')
          emitter.emit('test error', error, test, () => {
            assert.isFalse(call.isDone())
            done()
          })
        }))
    })

    describe('when ending', () => {
      let call = null
      const runId = '507f1f77bcf86cd799439011'
      let requestBody = null

      beforeEach(() => {
        const uri = `/apis/public/tests/run/${runId}`
        // This is a hack how to get access to the performed request from nock
        // nock isn't able to provide it
        function getBody(body) {
          requestBody = body
          return body
        }

        call = nock(env.APIARY_API_URL)
          .filteringRequestBody(getBody)
          .patch(uri)
          .reply(201, { _id: runId })
      })

      it('should update "test run" resource with result data', (done) => {
        emitter = new EventEmitter()
        const apiaryReporter = new ApiaryReporter(
          emitter,
          {},
          { custom: { apiaryReporterEnv: env } }
        )
        apiaryReporter.remoteId = runId
        emitter.emit('end', () => {
          assert.isTrue(call.isDone())
          done()
        })
      })

      it('should return generated url if no reportUrl is available', (done) => {
        emitter = new EventEmitter()
        const apiaryReporter = new ApiaryReporter(
          emitter,
          {},
          { custom: { apiaryReporterEnv: env } }
        )
        apiaryReporter.remoteId = runId
        emitter.emit('end', () => {
          assert.isOk(
            reporterOutputLoggerStub.complete.calledWith(
              'See results in Apiary at: https://app.apiary.io/public/tests/run/507f1f77bcf86cd799439011'
            )
          )
          done()
        })
      })

      it('should return reportUrl from testRun entity', (done) => {
        emitter = new EventEmitter()
        const apiaryReporter = new ApiaryReporter(
          emitter,
          {},
          { custom: { apiaryReporterEnv: env } }
        )
        apiaryReporter.remoteId = runId
        apiaryReporter.reportUrl =
          'https://absolutely.fancy.url/wich-can-change/some/id'
        emitter.emit('end', () => {
          assert.isOk(
            reporterOutputLoggerStub.complete.calledWith(
              'See results in Apiary at: https://absolutely.fancy.url/wich-can-change/some/id'
            )
          )
          done()
        })
      })

      it('should send runner.logs to Apiary at the end of testRun', (done) => {
        emitter = new EventEmitter()
        const logMessages = ['a', 'b']
        const apiaryReporter = new ApiaryReporter(
          emitter,
          {},
          { custom: { apiaryReporterEnv: env } },
          { logs: clone(logMessages) }
        )
        apiaryReporter.remoteId = runId
        emitter.emit('end', () => {
          assert.isString(requestBody)
          const parsedBody = JSON.parse(requestBody)
          assert.isObject(parsedBody)
          assert.property(parsedBody, 'logs')
          assert.deepEqual(parsedBody.logs, logMessages)
          done()
        })
      })

      describe('serverError is true', () =>
        it('should not do enything', (done) => {
          emitter = new EventEmitter()
          const apiaryReporter = new ApiaryReporter(
            emitter,
            {},
            { custom: { apiaryReporterEnv: env } }
          )
          apiaryReporter.remoteId = runId
          apiaryReporter.serverError = true
          emitter.emit('end', () => {
            assert.isFalse(call.isDone())
            done()
          })
        }))
    })
  })

  describe('with Apiary API token and suite id', () => {
    let test = {}
    let emitter = {}
    env = {}

    beforeEach((done) => {
      emitter = new EventEmitter()

      env = {}
      env.APIARY_API_URL = `https://127.0.0.1:${PORT}`
      env.APIARY_API_KEY = 'aff888af9993db9ef70edf3c878ab521'
      env.APIARY_API_NAME = 'jakubtest'
      test = {
        status: 'fail',
        title: 'POST /machines',
        message:
          "headers: Value of the ‘content-type’ must be application/json.\nbody: No validator found for real data media type 'text/plain' and expected data media type 'application/json'.\nstatusCode: Real and expected data does not match.\n",

        startedAt: 1234567890 * 1000, // JavaScript Date.now() timestamp (UNIX-like timestamp * 1000 precision)

        actual: {
          statusCode: 400,
          headers: {
            'content-type': 'text/plain'
          },

          body: 'Foo bar'
        },

        expected: {
          headers: {
            'content-type': 'application/json'
          },

          body:
            '{\n  "type": "bulldozer",\n  "name": "willy",\n  "id": "5229c6e8e4b0bd7dbb07e29c"\n}\n',
          status: '202'
        },

        request: {
          body: '{\n  "type": "bulldozer",\n  "name": "willy"}\n',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Dredd/0.2.1 (Darwin 13.0.0; x64)',
            'Content-Length': 44
          },

          uri: '/machines',
          method: 'POST'
        },

        results: {
          headers: {
            results: [
              {
                pointer: '/content-type',
                severity: 'error',
                message: 'Value of the ‘content-type’ must be application/json.'
              }
            ],
            realType: 'application/vnd.apiary.http-headers+json',
            expectedType: 'application/vnd.apiary.http-headers+json',
            validator: 'HeadersJsonExample',
            rawData: {
              0: {
                property: ['content-type'],
                propertyValue: 'text/plain',
                attributeName: 'enum',
                attributeValue: ['application/json'],
                message:
                  'Value of the ‘content-type’ must be application/json.',
                validator: 'enum',
                validatorName: 'enum',
                validatorValue: ['application/json']
              },

              length: 1
            }
          },

          body: {
            results: [
              {
                message:
                  "No validator found for real data media type 'text/plain' and expected data media type 'application/json'.",
                severity: 'error'
              }
            ],
            realType: 'text/plain',
            expectedType: 'application/json',
            validator: null,
            rawData: null
          },

          statusCode: {
            realType: 'text/vnd.apiary.status-code',
            expectedType: 'text/vnd.apiary.status-code',
            validator: 'TextDiff',
            rawData: '@@ -1,3 +1,9 @@\n-400\n+undefined\n',
            results: [
              {
                severity: 'error',
                message: 'Real and expected data does not match.'
              }
            ]
          }
        }
      }

      nock.disableNetConnect()
      done()
    })

    afterEach((done) => {
      nock.enableNetConnect()
      nock.cleanAll()
      done()
    })

    describe('when starting', () => {
      let call = null
      const runId = '507f1f77bcf86cd799439011'
      const reportUrl = 'https://absolutely.fancy.url/wich-can-change/some/id'
      let requestBody = null

      beforeEach(() => {
        const uri = `/apis/${env.APIARY_API_NAME}/tests/runs`

        requestBody = null
        function getBody(body) {
          requestBody = body
          return body
        }

        call = nock(env.APIARY_API_URL)
          .filteringRequestBody(getBody)
          .post(uri)
          .matchHeader('Authentication', `Token ${env.APIARY_API_KEY}`)
          .reply(201, { _id: runId, reportUrl })
      })

      it('should set uuid', (done) => {
        emitter = new EventEmitter()
        const apiaryReporter = new ApiaryReporter(
          emitter,
          {},
          { custom: { apiaryReporterEnv: env } }
        )
        emitter.emit('start', apiDescriptions, () => {
          assert.isNotNull(apiaryReporter.uuid)
          done()
        })
      })

      it('should set start time', (done) => {
        emitter = new EventEmitter()
        const apiaryReporter = new ApiaryReporter(
          emitter,
          {},
          { custom: { apiaryReporterEnv: env } }
        )
        emitter.emit('start', apiDescriptions, () => {
          assert.isNotNull(apiaryReporter.startedAt)
          done()
        })
      })

      it('should call "create new test run" HTTP resource', (done) => {
        emitter = new EventEmitter()
        new ApiaryReporter(emitter, {}, { custom: { apiaryReporterEnv: env } })
        emitter.emit('start', apiDescriptions, () => {
          assert.isTrue(call.isDone())
          done()
        })
      })

      it('should attach test run ID back to the reporter as remoteId', (done) => {
        emitter = new EventEmitter()
        const apiaryReporter = new ApiaryReporter(
          emitter,
          {},
          { custom: { apiaryReporterEnv: env } }
        )
        emitter.emit('start', apiDescriptions, () => {
          assert.isNotNull(apiaryReporter.remoteId)
          done()
        })
      })

      it('should attach test run reportUrl to the reporter as reportUrl', (done) => {
        emitter = new EventEmitter()
        const apiaryReporter = new ApiaryReporter(
          emitter,
          {},
          { custom: { apiaryReporterEnv: env } }
        )
        emitter.emit('start', apiDescriptions, () => {
          assert.isNotNull(apiaryReporter.reportUrl)
          done()
        })
      })

      it('should send the test-run as non-public', (done) => {
        emitter = new EventEmitter()
        new ApiaryReporter(
          emitter,
          {},
          {
            server: 'http://my.server.co:8080',
            custom: { apiaryReporterEnv: env }
          }
        )
        emitter.emit('start', apiDescriptions, () => {
          const parsedBody = JSON.parse(requestBody)
          assert.strictEqual(parsedBody.public, false)
          done()
        })
      })
    })

    describe('when adding passing test', () => {
      let call = null
      const runId = '507f1f77bcf86cd799439011'
      test = null

      beforeEach(() => {
        const uri = `/apis/${env.APIARY_API_NAME}/tests/steps?testRunId=${runId}`
        call = nock(env.APIARY_API_URL)
          .post(uri)
          .matchHeader('Authentication', `Token ${env.APIARY_API_KEY}`)
          .reply(201, { _id: runId })
      })

      it('should call "create new test step" HTTP resource', (done) => {
        emitter = new EventEmitter()
        const apiaryReporter = new ApiaryReporter(
          emitter,
          {},
          { custom: { apiaryReporterEnv: env } }
        )
        apiaryReporter.remoteId = runId
        emitter.emit('test pass', test, () => {
          assert.isTrue(call.isDone())
          done()
        })
      })
    })

    describe('when adding failing test', () => {
      let call = null
      const runId = '507f1f77bcf86cd799439011'
      test = null

      beforeEach(() => {
        const uri = `/apis/${env.APIARY_API_NAME}/tests/steps?testRunId=${runId}`
        call = nock(env.APIARY_API_URL)
          .post(uri)
          .matchHeader('Authentication', `Token ${env.APIARY_API_KEY}`)
          .reply(201, { _id: runId })
      })

      it('should call "create new test step" HTTP resource', (done) => {
        emitter = new EventEmitter()
        const apiaryReporter = new ApiaryReporter(
          emitter,
          {},
          { custom: { apiaryReporterEnv: env } }
        )
        apiaryReporter.remoteId = runId
        emitter.emit('test fail', test, () => {
          assert.isTrue(call.isDone())
          done()
        })
      })
    })

    describe('when ending', () => {
      let call = null
      const runId = '507f1f77bcf86cd799439011'

      beforeEach(() => {
        const uri = `/apis/${env.APIARY_API_NAME}/tests/run/${runId}`
        call = nock(env.APIARY_API_URL)
          .patch(uri)
          .matchHeader('Authentication', `Token ${env.APIARY_API_KEY}`)
          .reply(201, { _id: runId })
      })

      it('should update "test run" resource with result data', (done) => {
        emitter = new EventEmitter()
        const apiaryReporter = new ApiaryReporter(
          emitter,
          {},
          { custom: { apiaryReporterEnv: env } }
        )
        apiaryReporter.remoteId = runId
        emitter.emit('end', () => {
          assert.isTrue(call.isDone())
          done()
        })
      })

      it('should return generated url if reportUrl is not available', (done) => {
        emitter = new EventEmitter()
        const apiaryReporter = new ApiaryReporter(
          emitter,
          {},
          { custom: { apiaryReporterEnv: env } }
        )
        apiaryReporter.remoteId = runId
        emitter.emit('end', () => {
          assert.isOk(
            reporterOutputLoggerStub.complete.calledWith(
              'See results in Apiary at: https://app.apiary.io/jakubtest/tests/run/507f1f77bcf86cd799439011'
            )
          )
          done()
        })
      })

      it('should return reportUrl from testRun entity', (done) => {
        emitter = new EventEmitter()
        const apiaryReporter = new ApiaryReporter(
          emitter,
          {},
          { custom: { apiaryReporterEnv: env } }
        )
        apiaryReporter.remoteId = runId
        apiaryReporter.reportUrl =
          'https://absolutely.fancy.url/wich-can-change/some/id'
        emitter.emit('end', () => {
          assert.isOk(
            reporterOutputLoggerStub.complete.calledWith(
              'See results in Apiary at: https://absolutely.fancy.url/wich-can-change/some/id'
            )
          )
          done()
        })
      })
    })
  })
})
