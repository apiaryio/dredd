
sinon = require('sinon')

fixtures = require('../fixtures')
{assert, compileFixture} = require('../utils')
createLocationSchema = require('../schemas/location')


describe('compile() · Swagger', ->
  locationSchema = createLocationSchema()

  describe('causing a \'not specified in URI Template\' error', ->
    errors = undefined
    transactions = undefined

    beforeEach((done) ->
      compileFixture(fixtures.notSpecifiedInUriTemplateAnnotation.swagger, (args...) ->
        [err, {errors, transactions}] = args
        done(err)
      )
    )

    it('is compiled into expected number of transactions', ->
      assert.equal(transactions.length, 0)
    )
    it('is compiled with a single error', ->
      assert.equal(errors.length, 1)
    )
    context('the error', ->
      it('comes from parser', ->
        assert.equal(errors[0].component, 'apiDescriptionParser')
      )
      it('has code', ->
        assert.isNumber(errors[0].code)
      )
      it('has message', ->
        assert.include(errors[0].message.toLowerCase(), 'no corresponding')
        assert.include(errors[0].message.toLowerCase(), 'in the path string')
      )
      it('has no location', ->
        assert.notOk(errors[0].location)
      )
      it('has no origin', ->
        assert.isUndefined(errors[0].origin)
      )
    )
  )

  describe('with \'produces\'', ->
    request = undefined
    response = undefined

    beforeEach((done) ->
      compileFixture(fixtures.produces.swagger, (args...) ->
        [err, {transactions}] = args
        {request, response} = transactions[0]
        done(err)
      )
    )

    context('compiles a transaction', ->
      it('with expected request headers', ->
        assert.deepEqual(request.headers, {
          'Accept': {value: 'application/json'}
        })
      )
      it('with expected response headers', ->
        assert.deepEqual(response.headers, {
          'Content-Type': {value: 'application/json'}
        })
      )
    )
  )

  describe('with \'consumes\'', ->
    request = undefined
    response = undefined

    beforeEach((done) ->
      compileFixture(fixtures.consumes.swagger, (args...) ->
        [err, {transactions}] = args
        {request, response} = transactions[0]
        done(err)
      )
    )

    context('compiles a transaction', ->
      it('with expected request headers', ->
        assert.deepEqual(request.headers, {
          'Content-Type': {value: 'application/json'}
        })
      )
      it('with expected response headers', ->
        assert.deepEqual(response.headers, {})
      )
    )
  )

  describe('with multiple responses', ->
    transactions = undefined
    filename = 'apiDescription.json'
    detectTransactionExampleNumbers = sinon.spy(require('../../src/detect-transaction-example-numbers'))

    expectedStatusCodes = [200, 400, 500]

    beforeEach((done) ->
      stubs = {'./detect-transaction-example-numbers': detectTransactionExampleNumbers}

      compileFixture(fixtures.multipleResponses.swagger, {filename, stubs}, (args...) ->
        [err, compilationResult] = args
        transactions = compilationResult?.transactions
        done(err)
      )
    )

    it('detection of transaction examples was not called', ->
      assert.isFalse(detectTransactionExampleNumbers.called)
    )
    it('expected number of transactions was returned', ->
      assert.equal(transactions.length, expectedStatusCodes.length)
    )

    for statusCode, i in expectedStatusCodes
      do (statusCode, i) ->
        context("origin of transaction ##{i + 1}", ->
          it('uses URI as resource name', ->
            assert.equal(transactions[i].origin.resourceName, '/honey')
          )
          it('uses method as action name', ->
            assert.equal(transactions[i].origin.actionName, 'GET')
          )
          it('uses status code and response\'s Content-Type as example name', ->
            assert.equal(
              transactions[i].origin.exampleName,
              "#{statusCode} > application/json"
            )
          )
        )
  )
)
