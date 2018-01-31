{assert} = require('chai')
clone = require('clone')
{EventEmitter} = require('events')

{runDredd, createServer, runDreddWithServer} = require('./helpers')
Dredd = require('../../src/dredd')


describe('Sanitation of Reported Data', ->
  # sample sensitive data (this value is used in API Blueprint fixtures as well)
  sensitiveKey = 'token'
  sensitiveHeaderName = 'authorization'
  sensitiveValue = '5229c6e8e4b0bd7dbb07e29c'

  # recording events sent to reporters
  events = undefined
  emitter = undefined

  beforeEach( ->
    events = []
    emitter = new EventEmitter()

    # Dredd emits 'test *' events and reporters listen on them. To test whether
    # sensitive data will or won't make it to reporters, we need to capture all
    # the emitted events. We're using 'clone' to prevent propagation of subsequent
    # modifications of the 'test' object (Dredd can change the data after they're
    # reported and by reference they would change also here in the 'events' array).
    emitter.on('test start', (test) -> events.push({name: 'test start', test: clone(test)}))
    emitter.on('test pass', (test) -> events.push({name: 'test pass', test: clone(test)}))
    emitter.on('test skip', (test) -> events.push({name: 'test skip', test: clone(test)}))
    emitter.on('test fail', (test) -> events.push({name: 'test fail', test: clone(test)}))
    emitter.on('test error', (err, test) -> events.push({name: 'test error', test: clone(test), err}))

    # 'start' and 'end' events are asynchronous and they do not carry any data
    # significant for following scenarios
    emitter.on('start', (apiDescription, cb) -> events.push({name: 'start'}); cb() )
    emitter.on('end', (cb) -> events.push({name: 'end'}); cb() )
  )

  # helper for preparing Dredd instance with our custom emitter
  createDreddFromFixture = (fixtureName) ->
    new Dredd({
      emitter
      options: {
        path: "./test/fixtures/sanitation/#{fixtureName}.apib"
        hookfiles: "./test/fixtures/sanitation/#{fixtureName}.js"
      }
    })

  # helper for preparing the server under test
  createServerFromResponse = (response) ->
    app = createServer()
    app.put('/resource', (req, res) -> res.json(response))
    return app


  describe('Sanitation of the Entire Request Body', ->
    dreddRuntimeInfo = undefined

    beforeEach((done) ->
      dredd = createDreddFromFixture('entire-request-body')
      app = createServerFromResponse({name: 123}) # 'name' should be string → failing test

      runDreddWithServer(dredd, app, (err, runtimeInfo) ->
        return done(err) if err
        dreddRuntimeInfo = runtimeInfo.dredd
        done()
      )
    )

    it('results in one failed test', ->
      assert.equal(dreddRuntimeInfo.stats.failures, 1)
      assert.equal(dreddRuntimeInfo.stats.tests, 1)
    )
    it('emits expected events in expected order', ->
      assert.deepEqual((event.name for event in events), [
        'start', 'test start', 'test fail', 'end'
      ])
    )
    it('emitted test data does not contain request body', ->
      assert.equal(events[2].test.request.body, '')
    )
    it('sensitive data cannot be found anywhere in the emitted test data', ->
      test = JSON.stringify(events)
      assert.notInclude(test, sensitiveKey)
      assert.notInclude(test, sensitiveValue)
    )
    it('sensitive data cannot be found anywhere in Dredd output', ->
      assert.notInclude(dreddRuntimeInfo.logging, sensitiveKey)
      assert.notInclude(dreddRuntimeInfo.logging, sensitiveValue)
    )
  )

  describe('Sanitation of the Entire Response Body', ->
    dreddRuntimeInfo = undefined

    beforeEach((done) ->
      dredd = createDreddFromFixture('entire-response-body')
      app = createServerFromResponse({token: 123}) # 'token' should be string → failing test

      runDreddWithServer(dredd, app, (err, runtimeInfo) ->
        return done(err) if err
        dreddRuntimeInfo = runtimeInfo.dredd
        done()
      )
    )

    it('results in one failed test', ->
      assert.equal(dreddRuntimeInfo.stats.failures, 1)
      assert.equal(dreddRuntimeInfo.stats.tests, 1)
    )
    it('emits expected events in expected order', ->
      assert.deepEqual((event.name for event in events), [
        'start', 'test start', 'test fail', 'end'
      ])
    )
    it('emitted test data does not contain response body', ->
      assert.equal(events[2].test.actual.body, '')
      assert.equal(events[2].test.expected.body, '')
    )
    it('sensitive data cannot be found anywhere in the emitted test data', ->
      test = JSON.stringify(events)
      assert.notInclude(test, sensitiveKey)
      assert.notInclude(test, sensitiveValue)
    )
    it('sensitive data cannot be found anywhere in Dredd output', ->
      assert.notInclude(dreddRuntimeInfo.logging, sensitiveKey)
      assert.notInclude(dreddRuntimeInfo.logging, sensitiveValue)
    )
  )

  describe('Sanitation of a Request Body Attribute', ->
    dreddRuntimeInfo = undefined

    beforeEach((done) ->
      dredd = createDreddFromFixture('request-body-attribute')
      app = createServerFromResponse({name: 123}) # 'name' should be string → failing test

      runDreddWithServer(dredd, app, (err, runtimeInfo) ->
        return done(err) if err
        dreddRuntimeInfo = runtimeInfo.dredd
        done()
      )
    )

    it('results in one failed test', ->
      assert.equal(dreddRuntimeInfo.stats.failures, 1)
      assert.equal(dreddRuntimeInfo.stats.tests, 1)
    )
    it('emits expected events in expected order', ->
      assert.deepEqual((event.name for event in events), [
        'start', 'test start', 'test fail', 'end'
      ])
    )
    it('emitted test data does not contain confidential body attribute', ->
      attrs = Object.keys(JSON.parse(events[2].test.request.body))
      assert.deepEqual(attrs, ['name'])
    )
    it('sensitive data cannot be found anywhere in the emitted test data', ->
      test = JSON.stringify(events)
      assert.notInclude(test, sensitiveKey)
      assert.notInclude(test, sensitiveValue)
    )
    it('sensitive data cannot be found anywhere in Dredd output', ->
      assert.notInclude(dreddRuntimeInfo.logging, sensitiveKey)
      assert.notInclude(dreddRuntimeInfo.logging, sensitiveValue)
    )
  )

  describe('Sanitation of a Response Body Attribute', ->
    dreddRuntimeInfo = undefined

    beforeEach((done) ->
      dredd = createDreddFromFixture('response-body-attribute')
      app = createServerFromResponse({token: 123, name: 'Bob'}) # 'token' should be string → failing test

      runDreddWithServer(dredd, app, (err, runtimeInfo) ->
        return done(err) if err
        dreddRuntimeInfo = runtimeInfo.dredd
        done()
      )
    )

    it('results in one failed test', ->
      assert.equal(dreddRuntimeInfo.stats.failures, 1)
      assert.equal(dreddRuntimeInfo.stats.tests, 1)
    )
    it('emits expected events in expected order', ->
      assert.deepEqual((event.name for event in events), [
        'start', 'test start', 'test fail', 'end'
      ])
    )
    it('emitted test data does not contain confidential body attribute', ->
      attrs = Object.keys(JSON.parse(events[2].test.actual.body))
      assert.deepEqual(attrs, ['name'])

      attrs = Object.keys(JSON.parse(events[2].test.expected.body))
      assert.deepEqual(attrs, ['name'])
    )
    it('sensitive data cannot be found anywhere in the emitted test data', ->
      test = JSON.stringify(events)
      assert.notInclude(test, sensitiveKey)
      assert.notInclude(test, sensitiveValue)
    )
    it('sensitive data cannot be found anywhere in Dredd output', ->
      assert.notInclude(dreddRuntimeInfo.logging, sensitiveKey)
      assert.notInclude(dreddRuntimeInfo.logging, sensitiveValue)
    )
  )

  describe('Sanitation of Plain Text Response Body by Pattern Matching', ->
    dreddRuntimeInfo = undefined

    beforeEach((done) ->
      dredd = createDreddFromFixture('plain-text-response-body')
      app = createServerFromResponse("#{sensitiveKey}=42#{sensitiveValue}") # should be without '42' → failing test

      runDreddWithServer(dredd, app, (err, runtimeInfo) ->
        return done(err) if err
        dreddRuntimeInfo = runtimeInfo.dredd
        done()
      )
    )

    it('results in one failed test', ->
      assert.equal(dreddRuntimeInfo.stats.failures, 1)
      assert.equal(dreddRuntimeInfo.stats.tests, 1)
    )
    it('emits expected events in expected order', ->
      assert.deepEqual((event.name for event in events), [
        'start', 'test start', 'test fail', 'end'
      ])
    )
    it('emitted test data does contain the sensitive data censored', ->
      assert.include(events[2].test.actual.body, '--- CENSORED ---')
      assert.include(events[2].test.expected.body, '--- CENSORED ---')
    )
    it('sensitive data cannot be found anywhere in the emitted test data', ->
      assert.notInclude(JSON.stringify(events), sensitiveValue)
    )
    it('sensitive data cannot be found anywhere in Dredd output', ->
      assert.notInclude(dreddRuntimeInfo.logging, sensitiveValue)
    )
  )

  describe('Sanitation of Request Headers', ->
    dreddRuntimeInfo = undefined

    beforeEach((done) ->
      dredd = createDreddFromFixture('request-headers')
      app = createServerFromResponse({name: 123}) # 'name' should be string → failing test

      runDreddWithServer(dredd, app, (err, runtimeInfo) ->
        return done(err) if err
        dreddRuntimeInfo = runtimeInfo.dredd
        done()
      )
    )

    it('results in one failed test', ->
      assert.equal(dreddRuntimeInfo.stats.failures, 1)
      assert.equal(dreddRuntimeInfo.stats.tests, 1)
    )
    it('emits expected events in expected order', ->
      assert.deepEqual((event.name for event in events), [
        'start', 'test start', 'test fail', 'end'
      ])
    )
    it('emitted test data does not contain confidential header', ->
      names = (name.toLowerCase() for name of events[2].test.request.headers)
      assert.notInclude(names, sensitiveHeaderName)
    )
    it('sensitive data cannot be found anywhere in the emitted test data', ->
      test = JSON.stringify(events).toLowerCase()
      assert.notInclude(test, sensitiveHeaderName)
      assert.notInclude(test, sensitiveValue)
    )
    it('sensitive data cannot be found anywhere in Dredd output', ->
      logging = dreddRuntimeInfo.logging.toLowerCase()
      assert.notInclude(logging, sensitiveHeaderName)
      assert.notInclude(logging, sensitiveValue)
    )
  )

  describe('Sanitation of Response Headers', ->
    dreddRuntimeInfo = undefined

    beforeEach((done) ->
      dredd = createDreddFromFixture('response-headers')
      app = createServerFromResponse({name: 'Bob'}) # Authorization header is missing → failing test

      runDreddWithServer(dredd, app, (err, runtimeInfo) ->
        return done(err) if err
        dreddRuntimeInfo = runtimeInfo.dredd
        done()
      )
    )

    it('results in one failed test', ->
      assert.equal(dreddRuntimeInfo.stats.failures, 1)
      assert.equal(dreddRuntimeInfo.stats.tests, 1)
    )
    it('emits expected events in expected order', ->
      assert.deepEqual((event.name for event in events), [
        'start', 'test start', 'test fail', 'end'
      ])
    )
    it('emitted test data does not contain confidential header', ->
      names = (name.toLowerCase() for name of events[2].test.actual.headers)
      assert.notInclude(names, sensitiveHeaderName)

      names = (name.toLowerCase() for name of events[2].test.expected.headers)
      assert.notInclude(names, sensitiveHeaderName)
    )
    it('sensitive data cannot be found anywhere in the emitted test data', ->
      test = JSON.stringify(events).toLowerCase()
      assert.notInclude(test, sensitiveHeaderName)
      assert.notInclude(test, sensitiveValue)
    )
    it('sensitive data cannot be found anywhere in Dredd output', ->
      logging = dreddRuntimeInfo.logging.toLowerCase()
      assert.notInclude(logging, sensitiveHeaderName)
      assert.notInclude(logging, sensitiveValue)
    )
  )

  describe('Sanitation of URI Parameters by Pattern Matching', ->
    dreddRuntimeInfo = undefined

    beforeEach((done) ->
      dredd = createDreddFromFixture('uri-parameters')
      app = createServerFromResponse({name: 123}) # 'name' should be string → failing test

      runDreddWithServer(dredd, app, (err, runtimeInfo) ->
        return done(err) if err
        dreddRuntimeInfo = runtimeInfo.dredd
        done()
      )
    )

    it('results in one failed test', ->
      assert.equal(dreddRuntimeInfo.stats.failures, 1)
      assert.equal(dreddRuntimeInfo.stats.tests, 1)
    )
    it('emits expected events in expected order', ->
      assert.deepEqual((event.name for event in events), [
        'start', 'test start', 'test fail', 'end'
      ])
    )
    it('emitted test data does contain the sensitive data censored', ->
      assert.include(events[2].test.request.uri, 'CENSORED')
    )
    it('sensitive data cannot be found anywhere in the emitted test data', ->
      assert.notInclude(JSON.stringify(events), sensitiveValue)
    )
    it('sensitive data cannot be found anywhere in Dredd output', ->
      assert.notInclude(dreddRuntimeInfo.logging, sensitiveValue)
    )
  )

  # This fails because it's not possible to do 'transaction.test = myOwnTestObject;'
  # at the moment, Dredd ignores the new object.
  describe('Sanitation of Any Content by Pattern Matching', ->
    dreddRuntimeInfo = undefined

    beforeEach((done) ->
      dredd = createDreddFromFixture('any-content-pattern-matching')
      app = createServerFromResponse({name: 123}) # 'name' should be string → failing test

      runDreddWithServer(dredd, app, (err, runtimeInfo) ->
        return done(err) if err
        dreddRuntimeInfo = runtimeInfo.dredd
        done()
      )
    )

    it('results in one failed test', ->
      assert.equal(dreddRuntimeInfo.stats.failures, 1)
      assert.equal(dreddRuntimeInfo.stats.tests, 1)
    )
    it('emits expected events in expected order', ->
      assert.deepEqual((event.name for event in events), [
        'start', 'test start', 'test fail', 'end'
      ])
    )
    it('emitted test data does contain the sensitive data censored', ->
      assert.include(JSON.stringify(events), 'CENSORED')
    )
    it('sensitive data cannot be found anywhere in the emitted test data', ->
      assert.notInclude(JSON.stringify(events), sensitiveValue)
    )
    it('sensitive data cannot be found anywhere in Dredd output', ->
      assert.notInclude(dreddRuntimeInfo.logging, sensitiveValue)
    )
  )

  describe('Ultimate \'afterEach\' Guard Using Pattern Matching', ->
    dreddRuntimeInfo = undefined

    beforeEach((done) ->
      dredd = createDreddFromFixture('any-content-guard-pattern-matching')
      app = createServerFromResponse({name: 123}) # 'name' should be string → failing test

      runDreddWithServer(dredd, app, (err, runtimeInfo) ->
        return done(err) if err
        dreddRuntimeInfo = runtimeInfo.dredd
        done()
      )
    )

    it('results in one failed test', ->
      assert.equal(dreddRuntimeInfo.stats.failures, 1)
      assert.equal(dreddRuntimeInfo.stats.tests, 1)
    )
    it('emits expected events in expected order', ->
      assert.deepEqual((event.name for event in events), [
        'start', 'test start', 'test fail', 'end'
      ])
    )
    it('sensitive data cannot be found anywhere in the emitted test data', ->
      test = JSON.stringify(events)
      assert.notInclude(test, sensitiveValue)
    )
    it('sensitive data cannot be found anywhere in Dredd output', ->
      assert.notInclude(dreddRuntimeInfo.logging, sensitiveValue)
    )
    it('custom error message is printed', ->
      assert.include(dreddRuntimeInfo.logging, 'Sensitive data would be sent to Dredd reporter')
    )
  )

  describe('Sanitation of Test Data of Passing Transaction', ->
    dreddRuntimeInfo = undefined

    beforeEach((done) ->
      dredd = createDreddFromFixture('transaction-passing')
      app = createServerFromResponse({name: 'Bob'}) # passing test

      runDreddWithServer(dredd, app, (err, runtimeInfo) ->
        return done(err) if err
        dreddRuntimeInfo = runtimeInfo.dredd
        done()
      )
    )

    it('results in one passing test', ->
      assert.equal(dreddRuntimeInfo.stats.passes, 1)
      assert.equal(dreddRuntimeInfo.stats.tests, 1)
    )
    it('emits expected events in expected order', ->
      assert.deepEqual((event.name for event in events), [
        'start', 'test start', 'test pass', 'end'
      ])
    )
    it('emitted test data does not contain request body', ->
      assert.equal(events[2].test.request.body, '')
    )
    it('sensitive data cannot be found anywhere in the emitted test data', ->
      test = JSON.stringify(events)
      assert.notInclude(test, sensitiveKey)
      assert.notInclude(test, sensitiveValue)
    )
    it('sensitive data cannot be found anywhere in Dredd output', ->
      assert.notInclude(dreddRuntimeInfo.logging, sensitiveKey)
      assert.notInclude(dreddRuntimeInfo.logging, sensitiveValue)
    )
  )

  describe('Sanitation of Test Data When Transaction Is Marked as Failed in \'before\' Hook', ->
    dreddRuntimeInfo = undefined

    beforeEach((done) ->
      dredd = createDreddFromFixture('transaction-marked-failed-before')

      runDredd(dredd, (args...) ->
        [err, dreddRuntimeInfo] = args
        done()
      )
    )

    it('results in one failed test', ->
      assert.equal(dreddRuntimeInfo.stats.failures, 1)
      assert.equal(dreddRuntimeInfo.stats.tests, 1)
    )
    it('emits expected events in expected order', ->
      assert.deepEqual((event.name for event in events), [
        'start', 'test start', 'test fail', 'end'
      ])
    )
    it('emitted test is failed', ->
      assert.equal(events[2].test.status, 'fail')
      assert.include(events[2].test.results.general.results[0].message.toLowerCase(), 'fail')
    )
    it('emitted test data results contain just \'general\' section', ->
      assert.deepEqual(Object.keys(events[2].test.results), ['general'])
    )
    it('sensitive data cannot be found anywhere in the emitted test data', ->
      test = JSON.stringify(events)
      assert.notInclude(test, sensitiveKey)
      assert.notInclude(test, sensitiveValue)
    )
    it('sensitive data cannot be found anywhere in Dredd output', ->
      assert.notInclude(dreddRuntimeInfo.logging, sensitiveKey)
      assert.notInclude(dreddRuntimeInfo.logging, sensitiveValue)
    )
  )

  describe('Sanitation of Test Data When Transaction Is Marked as Failed in \'after\' Hook', ->
    dreddRuntimeInfo = undefined

    beforeEach((done) ->
      dredd = createDreddFromFixture('transaction-marked-failed-after')
      app = createServerFromResponse({name: 'Bob'}) # passing test

      runDreddWithServer(dredd, app, (err, runtimeInfo) ->
        return done(err) if err
        dreddRuntimeInfo = runtimeInfo.dredd
        done()
      )
    )

    it('results in one failed test', ->
      assert.equal(dreddRuntimeInfo.stats.failures, 1)
      assert.equal(dreddRuntimeInfo.stats.tests, 1)
    )
    it('emits expected events in expected order', ->
      assert.deepEqual((event.name for event in events), [
        'start', 'test start', 'test fail', 'end'
      ])
    )
    it('emitted test data does not contain request body', ->
      assert.equal(events[2].test.request.body, '')
    )
    it('emitted test is failed', ->
      assert.equal(events[2].test.status, 'fail')
      assert.include(events[2].test.results.general.results[0].message.toLowerCase(), 'fail')
    )
    it('emitted test data results contain all regular sections', ->
      assert.deepEqual(Object.keys(events[2].test.results), ['general', 'headers', 'body', 'statusCode'])
    )
    it('sensitive data cannot be found anywhere in the emitted test data', ->
      test = JSON.stringify(events)
      assert.notInclude(test, sensitiveKey)
      assert.notInclude(test, sensitiveValue)
    )
    it('sensitive data cannot be found anywhere in Dredd output', ->
      assert.notInclude(dreddRuntimeInfo.logging, sensitiveKey)
      assert.notInclude(dreddRuntimeInfo.logging, sensitiveValue)
    )
  )

  describe('Sanitation of Test Data When Transaction Is Marked as Skipped', ->
    dreddRuntimeInfo = undefined

    beforeEach((done) ->
      dredd = createDreddFromFixture('transaction-marked-skipped')

      runDredd(dredd, (args...) ->
        [err, dreddRuntimeInfo] = args
        done()
      )
    )

    it('results in one skipped test', ->
      assert.equal(dreddRuntimeInfo.stats.skipped, 1)
      assert.equal(dreddRuntimeInfo.stats.tests, 1)
    )
    it('emits expected events in expected order', ->
      assert.deepEqual((event.name for event in events), [
        'start', 'test start', 'test skip', 'end'
      ])
    )
    it('emitted test is skipped', ->
      assert.equal(events[2].test.status, 'skip')
      assert.deepEqual(Object.keys(events[2].test.results), ['general'])
      assert.include(events[2].test.results.general.results[0].message.toLowerCase(), 'skip')
    )
    it('sensitive data cannot be found anywhere in the emitted test data', ->
      test = JSON.stringify(events)
      assert.notInclude(test, sensitiveKey)
      assert.notInclude(test, sensitiveValue)
    )
    it('sensitive data cannot be found anywhere in Dredd output', ->
      assert.notInclude(dreddRuntimeInfo.logging, sensitiveKey)
      assert.notInclude(dreddRuntimeInfo.logging, sensitiveValue)
    )
  )

  describe('Sanitation of Test Data of Transaction With Erroring Hooks', ->
    dreddRuntimeInfo = undefined

    beforeEach((done) ->
      dredd = createDreddFromFixture('transaction-erroring-hooks')
      app = createServerFromResponse({name: 'Bob'}) # passing test

      runDreddWithServer(dredd, app, (err, runtimeInfo) ->
        return done(err) if err
        dreddRuntimeInfo = runtimeInfo.dredd
        done()
      )
    )

    it('results in one erroring test', ->
      assert.equal(dreddRuntimeInfo.stats.errors, 1)
      assert.equal(dreddRuntimeInfo.stats.tests, 1)
    )
    it('emits expected events in expected order', ->
      assert.deepEqual((event.name for event in events), [
        'start', 'test start', 'test error', 'end'
      ])
    )
    it('sensitive data leak to emitted test data', ->
      test = JSON.stringify(events)
      assert.include(test, sensitiveKey)
      assert.include(test, sensitiveValue)
    )
    it('sensitive data leak to Dredd output', ->
      assert.include(dreddRuntimeInfo.logging, sensitiveKey)
      assert.include(dreddRuntimeInfo.logging, sensitiveValue)
    )
  )

  describe('Sanitation of Test Data of Transaction With Secured Erroring Hooks', ->
    dreddRuntimeInfo = undefined

    beforeEach((done) ->
      dredd = createDreddFromFixture('transaction-secured-erroring-hooks')
      app = createServerFromResponse({name: 'Bob'}) # passing test

      runDreddWithServer(dredd, app, (err, runtimeInfo) ->
        return done(err) if err
        dreddRuntimeInfo = runtimeInfo.dredd
        done()
      )
    )

    it('results in one failed test', ->
      assert.equal(dreddRuntimeInfo.stats.failures, 1)
      assert.equal(dreddRuntimeInfo.stats.tests, 1)
    )
    it('emits expected events in expected order', ->
      assert.deepEqual((event.name for event in events), [
        'start', 'test start', 'test fail', 'end'
      ])
    )
    it('sensitive data cannot be found anywhere in the emitted test data', ->
      test = JSON.stringify(events)
      assert.notInclude(test, sensitiveKey)
      assert.notInclude(test, sensitiveValue)
    )
    it('sensitive data cannot be found anywhere in Dredd output', ->
      assert.notInclude(dreddRuntimeInfo.logging, sensitiveKey)
      assert.notInclude(dreddRuntimeInfo.logging, sensitiveValue)
    )
    it('custom error message is printed', ->
      assert.include(dreddRuntimeInfo.logging, 'Unexpected exception in hooks')
    )
  )
)
