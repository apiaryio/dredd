sinon = require('sinon')

fixtures = require('../fixtures')
{assert, compileFixture} = require('../utils')
createCompilationResultSchema = require('../schemas/compilation-result')


describe('compile() · Swagger', ->
  describe('causing a \'not specified in URI Template\' error', ->
    compilationResult = undefined

    beforeEach((done) ->
      compileFixture(fixtures.notSpecifiedInUriTemplateAnnotation.swagger, (args...) ->
        [err, compilationResult] = args
        done(err)
      )
    )

    it('produces one annotation and no transaction', ->
      assert.jsonSchema(compilationResult, createCompilationResultSchema(
        annotations: 1
        transactions: 0
      ))
    )
    context('the annotation', ->
      it('is error', ->
        assert.equal(compilationResult.annotations[0].type, 'error')
      )
      it('comes from the parser', ->
        assert.equal(compilationResult.annotations[0].component, 'apiDescriptionParser')
      )
      it('has message', ->
        assert.include(compilationResult.annotations[0].message.toLowerCase(), 'no corresponding')
        assert.include(compilationResult.annotations[0].message.toLowerCase(), 'in the path string')
      )
    )
  )

  describe('with \'produces\' containing JSON media type', ->
    compilationResult = undefined

    beforeEach((done) ->
      compileFixture(fixtures.produces.swagger, (args...) ->
        [err, compilationResult] = args
        done(err)
      )
    )

    it('produces no annotations and two transactions', ->
      assert.jsonSchema(compilationResult, createCompilationResultSchema(
        annotations: 0
        transactions: 2
      ))
    )
    [
      {accept: 'application/json', contentType: 'application/json'}
      {accept: 'application/json', contentType: 'text/plain'}
    ].forEach(({accept, contentType}, i) ->
      context("compiles a transaction for the '#{contentType}' media type", ->
        it('with expected request headers', ->
          assert.deepEqual(compilationResult.transactions[i].request.headers, [
            {name: 'Accept', value: accept}
          ])
        )
        it('with expected response headers', ->
          assert.deepEqual(compilationResult.transactions[i].response.headers, [
            {name: 'Content-Type', value: contentType}
          ])
        )
      )
    )
  )

  describe('with \'produces\' containing JSON media type with parameters', ->
    compilationResult = undefined

    beforeEach((done) ->
      compileFixture(fixtures.producesCharset.swagger, (args...) ->
        [err, compilationResult] = args
        done(err)
      )
    )

    it('produces no annotations and two transactions', ->
      assert.jsonSchema(compilationResult, createCompilationResultSchema(
        annotations: 0
        transactions: 2
      ))
    )
    [
      {accept: 'application/json; charset=utf-8', contentType: 'application/json; charset=utf-8'}
      {accept: 'application/json; charset=utf-8', contentType: 'text/plain'}
    ].forEach((mediaTypes, i) ->
      context("compiles transaction ##{i}", ->
        it('with expected request headers', ->
          assert.deepEqual(compilationResult.transactions[i].request.headers, [
            {name: 'Accept', value: mediaTypes.accept}
          ])
        )
        it('with expected response headers', ->
          assert.deepEqual(compilationResult.transactions[i].response.headers, [
            {name: 'Content-Type', value: mediaTypes.contentType}
          ])
        )
      )
    )
  )

  describe('with \'produces\' containing a non-JSON media type with an example', ->
    compilationResult = undefined

    beforeEach((done) ->
      compileFixture(fixtures.producesNonJSONExample.swagger, (args...) ->
        [err, compilationResult] = args
        done(err)
      )
    )

    it('produces no annotations and two transactions', ->
      assert.jsonSchema(compilationResult, createCompilationResultSchema(
        annotations: 0
        transactions: 2
      ))
    )
    [
      {accept: 'application/json', contentType: 'application/json'}
      {accept: 'text/plain', contentType: 'text/plain'}
    ].forEach((mediaTypes, i) ->
      context("compiles transaction ##{i}", ->
        it('with expected request headers', ->
          assert.deepEqual(compilationResult.transactions[i].request.headers, [
            {name: 'Accept', value: mediaTypes.accept}
          ])
        )
        it('with expected response headers', ->
          assert.deepEqual(compilationResult.transactions[i].response.headers, [
            {name: 'Content-Type', value: mediaTypes.contentType}
          ])
        )
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

    it('produces no annotations and two transactions', ->
      assert.jsonSchema(compilationResult, createCompilationResultSchema(
        annotations: 0
        transactions: 3
      ))
    )
    ['application/json', 'application/xml', 'application/json'].forEach((mediaType, i) ->
      context("compiles a transaction for the '#{mediaType}' media type", ->
        it('with expected request headers', ->
          assert.deepEqual(compilationResult.transactions[i].request.headers, [
            {name: 'Content-Type', value: mediaType}
          ])
        )
        it('with expected response headers', ->
          assert.deepEqual(compilationResult.transactions[i].response.headers, [])
        )
      )
    )
  )

  describe('with multiple responses', ->
    compilationResult = undefined
    filename = 'apiDescription.json'
    detectTransactionExampleNumbers = sinon.spy(require('../../src/detect-transaction-example-numbers'))
    expectedStatusCodes = [200, 400, 500]

    beforeEach((done) ->
      stubs = {'./detect-transaction-example-numbers': detectTransactionExampleNumbers}
      compileFixture(fixtures.multipleResponses.swagger, {filename, stubs}, (args...) ->
        [err, compilationResult] = args
        done(err)
      )
    )

    it('does not call the detection of transaction examples', ->
      assert.isFalse(detectTransactionExampleNumbers.called)
    )
    it("produces no annotations and #{expectedStatusCodes.length} transactions", ->
      assert.jsonSchema(compilationResult, createCompilationResultSchema(
        annotations: 0
        transactions: expectedStatusCodes.length
      ))
    )
    it('skips non-JSON media types in \'produces\'', ->
      compilationResult.transactions.forEach((transaction) ->
        contentType = transaction.response.headers
          .filter((header) -> header.name.toLowerCase() is 'content-type')
          .map((header) -> header.value)[0]
        assert.equal(contentType, 'application/json')
      )
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
            assert.equal(
              compilationResult.transactions[i].origin.exampleName,
              "#{statusCode} > application/json"
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

    it('produces no annotations and 2 transactions', ->
      assert.jsonSchema(compilationResult, createCompilationResultSchema(
        annotations: 0
        transactions: 2
      ))
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

    it('produces no annotations and 1 transaction', ->
      assert.jsonSchema(compilationResult, createCompilationResultSchema(
        annotations: 0
        transactions: 1
      ))
    )
  )

  describe('with default response (without explicit status code)', ->
    compilationResult = undefined

    beforeEach((done) ->
      compileFixture(fixtures.defaultResponse.swagger, (args...) ->
        [err, compilationResult] = args
        done(err)
      )
    )

    it('produces 2 annotations and 2 transactions', ->
      assert.jsonSchema(compilationResult, createCompilationResultSchema(
        annotations: 2
        transactions: 2
      ))
    )
    context('the annotations', ->
      it('are warnings', ->
        compilationResult.annotations.forEach((annotation) ->
          assert.equal(annotation.type, 'warning')
        )
      )
      it('are from parser', ->
        compilationResult.annotations.forEach((annotation) ->
          assert.equal(annotation.component, 'apiDescriptionParser')
        )
      )
      it('are about the default response being unsupported', ->
        compilationResult.annotations.forEach((annotation) ->
          assert.equal(annotation.message.toLowerCase(), 'default response is not yet supported')
        )
      )
    )
    it('assumes the solitary default response to be HTTP 200', ->
      assert.equal(compilationResult.transactions[0].response.status, '200')
    )
    it('ignores non-solitary default response, propagates only HTTP 204', ->
      assert.equal(compilationResult.transactions[1].response.status, '204')
    )
  )
)
