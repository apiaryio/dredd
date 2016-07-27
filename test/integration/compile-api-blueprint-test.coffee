
proxyquire = require('proxyquire').noPreserveCache()
sinon = require('sinon')

fixtures = require('../fixtures')
createLocationSchema = require('../schemas/location')
createOriginSchema = require('../schemas/origin')
{assert, compileFixture} = require('../utils')


describe('compile() · API Blueprint', ->
  locationSchema = createLocationSchema()
  originSchema = createOriginSchema()

  describe('causing a \'missing title\' warning', ->
    warnings = undefined
    transactions = undefined

    beforeEach((done) ->
      compileFixture(fixtures.missingTitleAnnotation.apiBlueprint, (args...) ->
        [err, {warnings, transactions}] = args
        done(err)
      )
    )

    it('is compiled into zero transactions', ->
      assert.equal(transactions.length, 0)
    )
    it('is compiled with one warning', ->
      assert.equal(warnings.length, 1)
    )
    context('the warning', ->
      it('comes from parser', ->
        assert.equal(warnings[0].component, 'apiDescriptionParser')
      )
      it('has code', ->
        assert.isNumber(warnings[0].code)
      )
      it('has message', ->
        assert.include(warnings[0].message.toLowerCase(), 'expected api name')
      )
      it('has location', ->
        assert.jsonSchema(warnings[0].location, locationSchema)
      )
      it('has no origin', ->
        assert.isUndefined(warnings[0].origin)
      )
    )
  )

  describe('causing a \'not specified in URI Template\' warning', ->
    # The warning was previously handled by compiler, but now parser should
    # already provide the same kind of warning.

    warnings = undefined
    transactions = undefined

    beforeEach((done) ->
      compileFixture(fixtures.notSpecifiedInUriTemplateAnnotation.apiBlueprint, (args...) ->
        [err, {warnings, transactions}] = args
        done(err)
      )
    )

    it('is compiled into expected number of transactions', ->
      assert.equal(transactions.length, 1)
    )
    it('is compiled with a single warning', ->
      assert.equal(warnings.length, 1)
    )
    context('the warning', ->
      it('comes from parser', ->
        assert.equal(warnings[0].component, 'apiDescriptionParser')
      )
      it('has code', ->
        assert.isNumber(warnings[0].code)
      )
      it('has message', ->
        assert.include(warnings[0].message.toLowerCase(), 'not specified in')
        assert.include(warnings[0].message.toLowerCase(), 'uri template')
      )
      it('has location', ->
        assert.jsonSchema(warnings[0].location, locationSchema)
      )
      it('has no origin', ->
        assert.isUndefined(warnings[0].origin)
      )
    )
  )

  describe('with multiple transaction examples', ->
    detectTransactionExamples = sinon.spy(require('../../src/detect-transaction-examples'))
    transactions = undefined
    exampleNumbersPerTransaction = [1, 1, 2]

    beforeEach((done) ->
      stubs = {'./detect-transaction-examples': detectTransactionExamples}

      compileFixture(fixtures.multipleTransactionExamples.apiBlueprint, {stubs}, (args...) ->
        [err, compilationResult] = args
        transactions = compilationResult.transactions
        done(err)
      )
    )

    it('detection of transaction examples was called', ->
      assert.isTrue(detectTransactionExamples.called)
    )
    it('is compiled into expected number of transactions', ->
      assert.equal(transactions.length, exampleNumbersPerTransaction.length)
    )
    for exampleNumber, i in exampleNumbersPerTransaction
      do (exampleNumber, i) ->
        context("transaction ##{i + 1}", ->
          it("is identified as part of Example #{exampleNumber}", ->
            assert.equal(
              transactions[i].origin.exampleName,
              "Example #{exampleNumber}"
            )
          )
        )
  )

  describe('without multiple transaction examples', ->
    detectTransactionExamples = sinon.spy(require('../../src/detect-transaction-examples'))
    compilationResult = undefined
    transaction = undefined

    beforeEach((done) ->
      stubs = {'./detect-transaction-examples': detectTransactionExamples}

      compileFixture(fixtures.oneTransactionExample.apiBlueprint, {stubs}, (args...) ->
        [err, compilationResult] = args
        transaction = compilationResult.transactions[0]
        done(err)
      )
    )

    it('detection of transaction examples was called', ->
      assert.isTrue(detectTransactionExamples.called)
    )
    it('is compiled into one transaction', ->
      assert.equal(compilationResult.transactions.length, 1)
    )
    context('the transaction', ->
      it("is identified as part of no example in \'origin\'", ->
        assert.equal(transaction.origin.exampleName, '')
      )
      it("is identified as part of Example 1 in \'pathOrigin\'", ->
        assert.equal(transaction.pathOrigin.exampleName, 'Example 1')
      )
    )
  )

  describe('with arbitrary action', ->
    transaction0 = undefined
    transaction1 = undefined
    filename = 'apiDescription.apib'

    beforeEach((done) ->
      compileFixture(fixtures.arbitraryAction.apiBlueprint, {filename}, (args...) ->
        [err, compilationResult] = args
        [transaction0, transaction1] = compilationResult.transactions
        done(err)
      )
    )

    context('action within a resource', ->
      it('has URI inherited from the resource', ->
        assert.equal(transaction0.request.uri, '/resource/1')
      )
      it('has its method', ->
        assert.equal(transaction0.request.method, 'GET')
      )
    )

    context('arbitrary action', ->
      it('has its own URI', ->
        assert.equal(transaction1.request.uri, '/arbitrary/sample')
      )
      it('has its method', ->
        assert.equal(transaction1.request.method, 'POST')
      )
    )
  )

  describe('without sections', ->
    transaction = undefined
    filename = 'apiDescription.apib'

    beforeEach((done) ->
      compileFixture(fixtures.withoutSections.apiBlueprint, {filename}, (args...) ->
        [err, compilationResult] = args
        transaction = compilationResult.transactions[0]
        done(err)
      )
    )

    context('\'origin\'', ->
      it('uses filename as API name', ->
        assert.equal(transaction.origin.apiName, filename)
      )
      it('uses empty string as resource group name', ->
        assert.equal(transaction.origin.resourceGroupName, '')
      )
      it('uses URI as resource name', ->
        assert.equal(transaction.origin.resourceName, '/message')
      )
      it('uses method as action name', ->
        assert.equal(transaction.origin.actionName, 'GET')
      )
    )

    context('\'pathOrigin\'', ->
      it('uses empty string as API name', ->
        assert.equal(transaction.pathOrigin.apiName, '')
      )
      it('uses empty string as resource group name', ->
        assert.equal(transaction.pathOrigin.resourceGroupName, '')
      )
      it('uses URI as resource name', ->
        assert.equal(transaction.pathOrigin.resourceName, '/message')
      )
      it('uses method as action name', ->
        assert.equal(transaction.pathOrigin.actionName, 'GET')
      )
    )
  )

  describe('with different sample and default value of URI parameter', ->
    transaction = undefined

    beforeEach((done) ->
      compileFixture(fixtures.preferSample.apiBlueprint, (args...) ->
        [err, compilationResult] = args
        transaction = compilationResult.transactions[0]
        done(err)
      )
    )

    it('expands the request URI using the sample value', ->
      assert.equal(transaction.request.uri, '/honey?beekeeper=Pavan')
    )
  )
)
