
sinon = require('sinon')

fixtures = require('../fixtures')
{assert, compileFixture} = require('../utils')
createLocationSchema = require('../schemas/location')


describe('compile() · Swagger', ->
  locationSchema = createLocationSchema()

  describe('causing a \'not specified in URI Template\' error', ->
    compilationResult = undefined

    beforeEach((done) ->
      compileFixture(fixtures.notSpecifiedInUriTemplateAnnotation.swagger, (args...) ->
        [err, compilationResult] = args
        done(err)
      )
    )

    it('is compiled into zero transactions', ->
      assert.deepEqual(compilationResult.transactions, [])
    )
    it('is compiled with no warnings', ->
      assert.deepEqual(compilationResult.warnings, [])
    )
    it('is compiled with a single error', ->
      assert.equal(compilationResult.errors.length, 1)
    )
    context('the error', ->
      it('comes from parser', ->
        assert.equal(compilationResult.errors[0].component, 'apiDescriptionParser')
      )
      it('has code', ->
        assert.isNumber(compilationResult.errors[0].code)
      )
      it('has message', ->
        assert.include(compilationResult.errors[0].message.toLowerCase(), 'no corresponding')
        assert.include(compilationResult.errors[0].message.toLowerCase(), 'in the path string')
      )
      it('has no location', ->
        assert.isUndefined(compilationResult.errors[0].location)
      )
      it('has no origin', ->
        assert.isUndefined(compilationResult.errors[0].origin)
      )
    )
  )

  describe('with \'produces\'', ->
    compilationResult = undefined

    beforeEach((done) ->
      compileFixture(fixtures.produces.swagger, (args...) ->
        [err, compilationResult] = args
        done(err)
      )
    )

    it('is compiled with no warnings', ->
      assert.deepEqual(compilationResult.warnings, [])
    )
    it('is compiled with no errors', ->
      assert.deepEqual(compilationResult.errors, [])
    )
    context('compiles a transaction', ->
      it('with expected request headers', ->
        assert.deepEqual(compilationResult.transactions[0].request.headers, {
          'Accept': {value: 'application/json'}
        })
      )
      it('with expected response headers', ->
        assert.deepEqual(compilationResult.transactions[0].response.headers, {
          'Content-Type': {value: 'application/json'}
        })
      )
    )
  )

  describe('with \'consumes\'', ->
    compilationResult = undefined

    beforeEach((done) ->
      compileFixture(fixtures.consumes.swagger, (args...) ->
        [err, compilationResult] = args
        done(err)
      )
    )

    it('is compiled with no warnings', ->
      assert.deepEqual(compilationResult.warnings, [])
    )
    it('is compiled with no errors', ->
      assert.deepEqual(compilationResult.errors, [])
    )
    context('compiles a transaction', ->
      it('with expected request headers', ->
        assert.deepEqual(compilationResult.transactions[0].request.headers, {
          'Content-Type': {value: 'application/json'}
        })
      )
      it('with expected response headers', ->
        assert.deepEqual(compilationResult.transactions[0].response.headers, {})
      )
    )
  )

  describe('with multiple responses', ->
    compilationResult = undefined
    filename = 'apiDescription.json'
    detectTransactionExampleNumbers = sinon.spy(require('../../src/detect-transaction-example-numbers'))
    expectedStatusCodes = [200, 200, 400, 400, 500, 500]

    beforeEach((done) ->
      stubs = {'./detect-transaction-example-numbers': detectTransactionExampleNumbers}
      compileFixture(fixtures.multipleResponses.swagger, {filename, stubs}, (args...) ->
        [err, compilationResult] = args
        done(err)
      )
    )

    it('does not call detection of transaction examples', ->
      assert.isFalse(detectTransactionExampleNumbers.called)
    )
    it('returns expected number of transactions', ->
      assert.equal(compilationResult.transactions.length, expectedStatusCodes.length)
    )
    it('is compiled with no warnings', ->
      assert.deepEqual(compilationResult.warnings, [])
    )
    it('is compiled with no errors', ->
      assert.deepEqual(compilationResult.errors, [])
    )

    for statusCode, i in expectedStatusCodes
      do (statusCode, i) ->
        context("origin of transaction ##{i + 1}", ->
          it('uses URI as resource name', ->
            assert.equal(compilationResult.transactions[i].origin.resourceName, '/honey')
          )

          it('uses method as action name', ->
            assert.equal(compilationResult.transactions[i].origin.actionName, 'GET')
          )

          it('uses status code and response\'s Content-Type as example name', ->
            contentType = if i % 2 then 'application/json' else 'application/xml'
            assert.equal(
              compilationResult.transactions[i].origin.exampleName,
              "#{statusCode} > #{contentType}"
            )
          )
        )
  )

  describe('with \'securityDefinitions\' and multiple responses', ->
    compilationResult = undefined

    beforeEach((done) ->
      compileFixture(fixtures.securityDefinitionsMultipleResponses.swagger, (args...) ->
        [err, compilationResult] = args
        done(err)
      )
    )

    it('is compiled with no warnings', ->
      assert.deepEqual(compilationResult.warnings, [])
    )
    it('is compiled with no errors', ->
      assert.deepEqual(compilationResult.errors, [])
    )
    it('returns expected number of transactions', ->
      assert.deepEqual(compilationResult.transactions.length, 2)
    )
  )

  describe('with \'securityDefinitions\' containing transitions', ->
    compilationResult = undefined

    beforeEach((done) ->
      compileFixture(fixtures.securityDefinitionsTransitions.swagger, (args...) ->
        [err, compilationResult] = args
        done(err)
      )
    )

    it('is compiled with no warnings', ->
      assert.deepEqual(compilationResult.warnings, [])
    )
    it('is compiled with no errors', ->
      assert.deepEqual(compilationResult.errors, [])
    )
    it('returns expected number of transactions', ->
      assert.deepEqual(compilationResult.transactions.length, 1)
    )
  )
)
