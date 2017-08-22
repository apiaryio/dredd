proxyquire = require('proxyquire').noPreserveCache()

fixtures = require('../fixtures')
createCompilationResultSchema = require('../schemas/compilation-result')
createLocationSchema = require('../schemas/location')
createOriginSchema = require('../schemas/origin')
{assert, compileFixture} = require('../utils')


describe('compile() · all API description formats', ->
  locationSchema = createLocationSchema()
  originSchema = createOriginSchema()

  describe('ordinary, valid API description', ->
    filename = 'apiDescription.ext'
    compilationResultSchema = createCompilationResultSchema({
      filename
      transactions: true
      paths: false
      mediaType: false
    })

    fixtures.ordinary.forEachDescribe(({source}) ->
      compilationResult = undefined

      beforeEach((done) ->
        compileFixture(source, {filename}, (args...) ->
          [err, compilationResult] = args
          done(err)
        )
      )

      it('is compiled into a compilation result of expected structure', ->
        assert.jsonSchema(compilationResult, compilationResultSchema)
      )
    )
  )

  describe('causing an error in the parser', ->
    fixtures.parserError.forEachDescribe(({source}) ->
      compilationResult = undefined

      beforeEach((done) ->
        compileFixture(source, (args...) ->
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
      it('is compiled with an error', ->
        assert.ok(compilationResult.errors.length)
      )
      context('the error', ->
        it('comes from parser', ->
          assert.equal(compilationResult.errors[0].component, 'apiDescriptionParser')
        )
        it('has code', ->
          assert.isNumber(compilationResult.errors[0].code)
        )
        it('has message', ->
          assert.isString(compilationResult.errors[0].message)
        )
        it('has location', ->
          assert.jsonSchema(compilationResult.errors[0].location, locationSchema)
        )
        it('has no origin', ->
          assert.isUndefined(compilationResult.errors[0].origin)
        )
      )
    )
  )

  describe('causing an error in URI expansion', ->
    # Parsers may provide warning in similar situations, however, we do not
    # want to rely on them (implementations differ). This error is returned
    # in case Dredd Transactions are not able to parse the URI template.
    # Mind that situations when parser gives the warning and when this error
    # is thrown can differ and also the severity is different.

    fixtures.uriExpansionAnnotation.forEachDescribe(({source}) ->
      compilationResult = undefined

      beforeEach((done) ->
        compileFixture(source, (args...) ->
          [err, compilationResult] = args
          done(err)
        )
      )

      it('is compiled into zero transactions', ->
        assert.deepEqual(compilationResult.transactions, [])
      )
      it('is compiled with one error', ->
        assert.equal(compilationResult.errors.length, 1)
      )
      context('the error', ->
        it('comes from compiler', ->
          assert.equal(compilationResult.errors[0].component, 'uriTemplateExpansion')
        )
        it('has no code', ->
          assert.isUndefined(compilationResult.errors[0].code)
        )
        it('has message', ->
          assert.include(compilationResult.errors[0].message.toLowerCase(), 'failed to parse uri template')
        )
        it('has no location', ->
          assert.isUndefined(compilationResult.errors[0].location)
        )
        it('has origin', ->
          assert.jsonSchema(compilationResult.errors[0].origin, originSchema)
        )
      )
    )
  )

  describe('causing an error in URI validation', ->
    # Parsers may provide warning in similar situations, however, we do not
    # want to rely on them (implementations differ). This error is returned
    # in case Dredd Transactions are not satisfied with the input for
    # expanding the URI template. Mind that situations when parser gives
    # the warning and when this error is returned can differ and also
    # the severity is different.

    fixtures.uriValidationAnnotation.forEachDescribe(({source}) ->
      compilationResult = undefined

      beforeEach((done) ->
        compileFixture(source, (args...) ->
          [err, compilationResult] = args
          done(err)
        )
      )

      it('is compiled into zero transactions', ->
        assert.deepEqual(compilationResult.transactions, [])
      )
      it('is compiled with one error', ->
        assert.equal(compilationResult.errors.length, 1)
      )
      context('the error', ->
        it('comes from compiler', ->
          assert.equal(compilationResult.errors[0].component, 'parametersValidation')
        )
        it('has no code', ->
          assert.isUndefined(compilationResult.errors[0].code)
        )
        it('has message', ->
          assert.include(compilationResult.errors[0].message.toLowerCase(), 'no example')
        )
        it('has no location', ->
          assert.isUndefined(compilationResult.errors[0].location)
        )
        it('has origin', ->
          assert.jsonSchema(compilationResult.errors[0].origin, originSchema)
        )
      )
    )
  )

  describe('causing a warning in the parser', ->
    fixtures.parserWarning.forEachDescribe(({source}) ->
      compilationResult = undefined

      beforeEach((done) ->
        compileFixture(source, (args...) ->
          [err, compilationResult] = args
          done(err)
        )
      )

      it('is compiled into expected number of transactions', ->
        assert.equal(compilationResult.transactions.length, 1)
      )
      it('is compiled with warnings', ->
        assert.ok(compilationResult.warnings.length)
      )
      context('the warning', ->
        it('comes from parser', ->
          assert.equal(compilationResult.warnings[0].component, 'apiDescriptionParser')
        )
        it('has code', ->
          assert.isNumber(compilationResult.warnings[0].code)
        )
        it('has message', ->
          assert.isString(compilationResult.warnings[0].message)
        )
        it('has location', ->
          assert.jsonSchema(compilationResult.warnings[0].location, locationSchema)
        )
        it('has no origin', ->
          assert.isUndefined(compilationResult.warnings[0].origin)
        )
      )
      it('is compiled with no errors', ->
        assert.deepEqual(compilationResult.errors, [])
      )
    )
  )

  describe('causing a warning in URI expansion', ->
    # This is a test for an arbitrary warning coming from URI expansion, which
    # doesn't have any other special side effect. Since there are no such
    # warnings as of now (but were in the past and could be in the future),
    # we need to pretend it's possible in this test.

    warnings = undefined
    transactions = undefined
    message = '... dummy warning message ...'

    stubs =
      './compile-uri': proxyquire('../../src/compile-uri',
        './expand-uri-template': (args...) ->
          {uri: '/honey?beekeeper=Honza', errors: [], warnings: [message]}
      )

    fixtures.ordinary.forEachDescribe(({source}) ->
      compilationResult = undefined

      beforeEach((done) ->
        compileFixture(source, {stubs}, (args...) ->
          [err, compilationResult] = args
          done(err)
        )
      )

      it('is compiled into some transactions', ->
        assert.ok(compilationResult.transactions.length)
      )
      it('is compiled with warnings', ->
        assert.ok(compilationResult.warnings.length)
      )
      context('the warning', ->
        it('comes from compiler', ->
          assert.equal(compilationResult.warnings[0].component, 'uriTemplateExpansion')
        )
        it('has no code', ->
          assert.isUndefined(compilationResult.warnings[0].code)
        )
        it('has message', ->
          assert.include(compilationResult.warnings[0].message, message)
        )
        it('has no location', ->
          assert.isUndefined(compilationResult.warnings[0].location)
        )
        it('has origin', ->
          assert.jsonSchema(compilationResult.warnings[0].origin, originSchema)
        )
      )
      it('is compiled with no errors', ->
        assert.deepEqual(compilationResult.errors, [])
      )
    )
  )

  describe('causing an \'ambiguous parameters\' warning in URI expansion', ->
    # Special side effect of the warning is that affected transactions
    # should be skipped (shouldn't appear in output of the compilation).
    #
    # The API description documents used as fixtures to test this situation
    # can also cause errors. We do not care about those in this test.

    fixtures.ambiguousParametersAnnotation.forEachDescribe(({source}) ->
      compilationResult = undefined

      beforeEach((done) ->
        compileFixture(source, (args...) ->
          [err, compilationResult] = args
          done(err)
        )
      )

      it('is compiled into zero transactions', ->
        assert.deepEqual(compilationResult.transactions, [])
      )
      it('is compiled with one warning', ->
        assert.equal(compilationResult.warnings.length, 1)
      )
      context('the warning', ->
        it('comes from compiler', ->
          assert.equal(compilationResult.warnings[0].component, 'uriTemplateExpansion')
        )
        it('has no code', ->
          assert.isUndefined(compilationResult.warnings[0].code)
        )
        it('has message', ->
          assert.include(compilationResult.warnings[0].message.toLowerCase(), 'ambiguous')
        )
        it('has no location', ->
          assert.isUndefined(compilationResult.warnings[0].location)
        )
        it('has origin', ->
          assert.jsonSchema(compilationResult.warnings[0].origin, originSchema)
        )
      )
    )
  )

  describe('causing a warning in URI validation', ->
    # Since 'validateParams' doesn't actually return any warnings
    # (but could in the future), we need to pretend it's possible for this
    # test.

    message = '... dummy warning message ...'
    stubs =
      './compile-uri': proxyquire('../../src/compile-uri',
        './validate-params': (args...) ->
          {errors: [], warnings: [message]}
      )

    fixtures.ordinary.forEachDescribe(({source}) ->
      compilationResult = undefined

      beforeEach((done) ->
        compileFixture(source, {stubs}, (args...) ->
          [err, compilationResult] = args
          done(err)
        )
      )

      it('is compiled into some transactions', ->
        assert.ok(compilationResult.transactions.length)
      )
      it('is compiled with warnings', ->
        assert.ok(compilationResult.warnings.length)
      )
      context('the warning', ->
        it('comes from compiler', ->
          assert.equal(compilationResult.warnings[0].component, 'parametersValidation')
        )
        it('has no code', ->
          assert.isUndefined(compilationResult.warnings[0].code)
        )
        it('has message', ->
          assert.include(compilationResult.warnings[0].message, message)
        )
        it('has no location', ->
          assert.isUndefined(compilationResult.warnings[0].location)
        )
        it('has origin', ->
          assert.jsonSchema(compilationResult.warnings[0].origin, originSchema)
        )
      )
      it('is compiled with no errors', ->
        assert.deepEqual(compilationResult.errors, [])
      )
    )
  )

  describe('with enum parameter', ->
    fixtures.enumParameter.forEachDescribe(({source}) ->
      compilationResult = undefined

      beforeEach((done) ->
        compileFixture(source, (args...) ->
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
      it('expands the request URI with the first enum value', ->
        assert.equal(compilationResult.transactions[0].request.uri, '/honey?beekeeper=Adam')
      )
    )
  )

  describe('with enum parameter having example value', ->
    fixtures.enumParameterExample.forEachDescribe(({source}) ->
      compilationResult = undefined

      beforeEach((done) ->
        compileFixture(source, (args...) ->
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
      it('expands the request URI with the example value', ->
        assert.equal(compilationResult.transactions[0].request.uri, '/honey?beekeeper=Honza')
      )
    )
  )

  describe('with enum parameter having unlisted example value', ->
    # Parsers may provide warning in similar situations, however, we do not
    # want to rely on them (implementations differ). This error is returned
    # in case enum parameters have an example value, which is not allowed
    # by the enum. Mind that situations when parser gives the warning and
    # when this error is returned can differ and also the severity is different.

    fixtures.enumParameterUnlistedExample.forEachDescribe(({source}) ->
      compilationResult = undefined

      beforeEach((done) ->
        compileFixture(source, (args...) ->
          [err, compilationResult] = args
          done(err)
        )
      )

      it('is compiled into one transaction', ->
        assert.equal(compilationResult.transactions.length, 1)
      )
      it('is compiled with one error', ->
        assert.equal(compilationResult.errors.length, 1)
      )
      context('the error', ->
        it('comes from compiler', ->
          assert.equal(compilationResult.errors[0].component, 'parametersValidation')
        )
        it('has no code', ->
          assert.isUndefined(compilationResult.errors[0].code)
        )
        it('has message', ->
          assert.include(compilationResult.errors[0].message.toLowerCase(), 'example value is not one of enum values')
        )
        it('has no location', ->
          assert.isUndefined(compilationResult.errors[0].location)
        )
        it('has origin', ->
          assert.jsonSchema(compilationResult.errors[0].origin, originSchema)
        )
      )
      it('expands the request URI with the example value', ->
        assert.equal(compilationResult.transactions[0].request.uri, '/honey?beekeeper=Pavan')
      )
    )
  )

  describe.skip('with parameters having example values', ->
    fixtures.exampleParameters.forEachDescribe(({source}) ->
      compilationResult = undefined

      beforeEach((done) ->
        compileFixture(source, (args...) ->
          [err, compilationResult] = args
          done(err)
        )
      )

      it.skip('is compiled with no warnings', ->
        # https://github.com/apiaryio/drafter/issues/500
        assert.deepEqual(compilationResult.warnings, [])
      )
      it('is compiled with no errors', ->
        assert.deepEqual(compilationResult.errors, [])
      )
      it('expands the request URI with the example value', ->
        assert.equal(compilationResult.transactions[0].request.uri, '/honey?beekeeper=Honza&flavour=sweet,spicy')
      )
    )
  )

  describe('with response schema', ->
    fixtures.responseSchema.forEachDescribe(({source}) ->
      compilationResult = undefined

      beforeEach((done) ->
        compileFixture(source, (args...) ->
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
      it('provides the body in response data', ->
        assert.ok(compilationResult.transactions[0].response.body)
        assert.doesNotThrow( -> JSON.parse(compilationResult.transactions[0].response.body))
      )
      it('provides the schema in response data', ->
        assert.ok(compilationResult.transactions[0].response.schema)
        assert.doesNotThrow( -> JSON.parse(compilationResult.transactions[0].response.schema))
      )
    )
  )

  describe('with inheritance of URI parameters', ->
    fixtures.parametersInheritance.forEachDescribe(({source}) ->
      compilationResult = undefined

      beforeEach((done) ->
        compileFixture(source, (args...) ->
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
      it('expands the request URI using correct inheritance cascade', ->
        assert.equal(compilationResult.transactions[0].request.uri, '/honey?beekeeper=Honza&amount=42')
      )
    )
  )

  describe('with different default value and first enum value of URI parameter', ->
    fixtures.preferDefault.forEachDescribe(({source}) ->
      compilationResult = undefined

      beforeEach((done) ->
        compileFixture(source, (args...) ->
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
      it('expands the request URI using the default value', ->
        assert.equal(compilationResult.transactions[0].request.uri, '/honey?beekeeper=Adam')
      )
    )
  )

  describe('with default value for a required URI parameter', ->
    fixtures.defaultRequired.forEachDescribe(({source}) ->
      compilationResult = undefined

      beforeEach((done) ->
        compileFixture(source, (args...) ->
          [err, compilationResult] = args
          done(err)
        )
      )

      it('expands the request URI using the default value', ->
        assert.equal(compilationResult.transactions[0].request.uri, '/honey?beekeeper=Honza')
      )
      it('is compiled with no errors', ->
        assert.deepEqual(compilationResult.errors, [])
      )
      it('is compiled with warnings', ->
        assert.ok(compilationResult.warnings.length)
      )
      it('there are no other warnings than from parser or URI expansion', ->
        assert.equal(compilationResult.warnings.filter((w) ->
          w.component isnt 'uriTemplateExpansion' and
          w.component isnt 'apiDescriptionParser'
        ).length, 0)
      )
      context('the last warning', ->
        it('comes from URI expansion', ->
          assert.equal(compilationResult.warnings[-1..][0].component, 'uriTemplateExpansion')
        )
        it('has no code', ->
          assert.isUndefined(compilationResult.warnings[-1..][0].code)
        )
        it('has message', ->
          assert.include(compilationResult.warnings[-1..][0].message.toLowerCase(), 'default value for a required parameter')
        )
        it('has no location', ->
          assert.isUndefined(compilationResult.warnings[-1..][0].location)
        )
        it('has origin', ->
          assert.jsonSchema(compilationResult.warnings[-1..][0].origin, originSchema)
        )
      )
    )
  )

  describe('with HTTP headers', ->
    fixtures.httpHeaders.forEachDescribe(({source}) ->
      compilationResult = undefined

      beforeEach((done) ->
        compileFixture(source, (args...) ->
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
            'Accept': {value: 'application/json'}
          })
        )
        it('with expected response headers', ->
          assert.deepEqual(compilationResult.transactions[0].response.headers, {
            'Content-Type': {value: 'application/json'}
            'X-Test': {value: 'Adam'}
          })
        )
      )
    )
  )
)
