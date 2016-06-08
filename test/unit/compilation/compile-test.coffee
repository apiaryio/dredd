
fixtures = require('../../fixtures')
createCompilationResultSchema = require('../../schemas/compilation-result')
createLocationSchema = require('../../schemas/location')
createOriginSchema = require('../../schemas/origin')
{assert, compileFixture} = require('../../utils')


describe('compile() · all API description formats', ->
  locationSchema = createLocationSchema()
  originSchema = createOriginSchema()

  describe('causing an error in the parser', ->
    fixtures.parserError.forEachDescribe(({source}) ->
      err = undefined
      errors = undefined
      transactions = undefined

      beforeEach((done) ->
        compileFixture(source, (args...) ->
          [err, {errors, transactions}] = args
          done(err)
        )
      )

      it('is compiled into zero transactions', ->
        assert.equal(transactions.length, 0)
      )
      it('is compiled with an error', ->
        assert.ok(errors.length)
      )
      context('the error', ->
        it('comes from parser', ->
          assert.equal(errors[0].component, 'apiDescriptionParser')
        )
        it('has code', ->
          assert.isNumber(errors[0].code)
        )
        it('has message', ->
          assert.isString(errors[0].message)
        )
        it('has location', ->
          assert.jsonSchema(errors[0].location, locationSchema)
        )
        it('has no origin', ->
          assert.isUndefined(errors[0].origin)
        )
      )
    )
  )

  describe('causing an error in URI expansion', ->
    # Parsers may provide warning in similar situations, however, we do not
    # rely on it in any way in behaviour tested here. This error is thrown
    # in case Dredd Transactions are not able to parse the URI template.
    # Mind that situations when parser gives the warning and when this error
    # is thrown can differ and also the severity is different.

    err = undefined
    errors = undefined
    transactions = undefined

    fixtures.uriExpansionAnnotation.forEachDescribe(({source}) ->
      beforeEach((done) ->
        compileFixture(source, (args...) ->
          [err, {errors, transactions}] = args
          done(err)
        )
      )

      it('is compiled into zero transactions', ->
        assert.equal(transactions.length, 0)
      )
      it('is compiled with one error', ->
        assert.equal(errors.length, 1)
      )
      context('the error', ->
        it('comes from compiler', ->
          assert.equal(errors[0].component, 'uriTemplateExpansion')
        )
        it('has no code', ->
          assert.isUndefined(errors[0].code)
        )
        it('has message', ->
          assert.include(errors[0].message.toLowerCase(), 'failed to parse uri template')
        )
        it('has no location', ->
          assert.isUndefined(errors[0].location)
        )
        it('has origin', ->
          assert.jsonSchema(errors[0].origin, originSchema)
        )
      )
    )
  )

  describe('causing an error in URI validation', ->
    err = undefined
    errors = undefined
    transactions = undefined

    fixtures.uriValidationAnnotation.forEachDescribe(({source}) ->
      beforeEach((done) ->
        compileFixture(source, (args...) ->
          [err, {errors, transactions}] = args
          done(err)
        )
      )

      it('is compiled into zero transactions', ->
        assert.equal(transactions.length, 0)
      )
      it('is compiled with one error', ->
        assert.equal(errors.length, 1)
      )
      context('the error', ->
        it('comes from compiler', ->
          assert.equal(errors[0].component, 'parametersValidation')
        )
        it('has no code', ->
          assert.isUndefined(errors[0].code)
        )
        it('has message', ->
          assert.include(errors[0].message.toLowerCase(), 'no example value')
        )
        it('has no location', ->
          assert.isUndefined(errors[0].location)
        )
        it('has origin', ->
          assert.jsonSchema(errors[0].origin, originSchema)
        )
      )
    )
  )

  describe('causing a warning in the parser', ->
    fixtures.parserWarning.forEachDescribe(({source}) ->
      err = undefined
      warnings = undefined
      transactions = undefined

      beforeEach((done) ->
        compileFixture(source, (args...) ->
          [err, {warnings, transactions}] = args
          done(err)
        )
      )

      it('is compiled into expected number of transactions', ->
        assert.equal(transactions.length, 1)
      )
      it('is compiled with a warning', ->
        assert.ok(warnings.length)
      )
      context('the warning', ->
        it('comes from parser', ->
          assert.equal(warnings[0].component, 'apiDescriptionParser')
        )
        it('has code', ->
          assert.isNumber(warnings[0].code)
        )
        it('has message', ->
          assert.isString(warnings[0].message)
        )
        it('has location', ->
          assert.jsonSchema(warnings[0].location, locationSchema)
        )
        it('has no origin', ->
          assert.isUndefined(warnings[0].origin)
        )
      )
    )
  )

  describe('causing a warning in URI expansion', ->
    # This is a test for an arbitrary warning coming from URI expansion, which
    # doesn't have any other special side effect. Since there are no such
    # warnings as of now (but were in the past and could be in the future),
    # we need to pretend it's possible in this test.

    err = undefined
    warnings = undefined
    transactions = undefined
    message = '... dummy warning message ...'

    stubs =
      './expand-uri-template-with-parameters': (args...) ->
        {uri: '/honey?beekeeper=Honza', errors: [], warnings: [message]}

    fixtures.ordinary.forEachDescribe(({source}) ->
      beforeEach((done) ->
        compileFixture(source, {stubs}, (err, compilationResult) ->
          return done(err) if err
          {warnings, transactions} = compilationResult
          done()
        )
      )

      it('is compiled into some transactions', ->
        assert.ok(transactions.length)
      )
      it('is compiled with warnings', ->
        assert.ok(warnings.length)
      )
      context('the warning', ->
        it('comes from compiler', ->
          assert.equal(warnings[0].component, 'uriTemplateExpansion')
        )
        it('has no code', ->
          assert.isUndefined(warnings[0].code)
        )
        it('has message', ->
          assert.include(warnings[0].message, message)
        )
        it('has no location', ->
          assert.isUndefined(warnings[0].location)
        )
        it('has origin', ->
          assert.jsonSchema(warnings[0].origin, originSchema)
        )
      )
    )
  )

  describe('causing an \'ambiguous parameters\' warning in URI expansion', ->
    # Special side effect of the warning is that affected transactions
    # should be skipped (shouldn't appear in output of the compilation).

    err = undefined
    warnings = undefined
    transactions = undefined

    fixtures.ambiguousParametersAnnotation.forEachDescribe(({source}) ->
      beforeEach((done) ->
        compileFixture(source, (args...) ->
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
        it('comes from compiler', ->
          assert.equal(warnings[0].component, 'uriTemplateExpansion')
        )
        it('has no code', ->
          assert.isUndefined(warnings[0].code)
        )
        it('has message', ->
          assert.include(warnings[0].message.toLowerCase(), 'ambiguous')
        )
        it('has no location', ->
          assert.isUndefined(warnings[0].location)
        )
        it('has origin', ->
          assert.jsonSchema(warnings[0].origin, originSchema)
        )
      )
    )
  )

  describe('causing a warning in URI validation', ->
    # Since 'validateParameters' doesn't actually return any warnings
    # (but could in the future), we need to pretend it's possible for this
    # test.

    err = undefined
    warnings = undefined
    transactions = undefined
    message = '... dummy warning message ...'

    stubs =
      './validate-parameters': (args...) ->
        {errors: [], warnings: [message]}

    fixtures.ordinary.forEachDescribe(({source}) ->
      beforeEach((done) ->
        compileFixture(source, {stubs}, (err, compilationResult) ->
          return done(err) if err
          {warnings, transactions} = compilationResult
          done()
        )
      )

      it('is compiled into some transactions', ->
        assert.ok(transactions.length)
      )
      it('is compiled with warnings', ->
        assert.ok(warnings.length)
      )
      context('the warning', ->
        it('comes from compiler', ->
          assert.equal(warnings[0].component, 'parametersValidation')
        )
        it('has no code', ->
          assert.isUndefined(warnings[0].code)
        )
        it('has message', ->
          assert.include(warnings[0].message, message)
        )
        it('has no location', ->
          assert.isUndefined(warnings[0].location)
        )
        it('has origin', ->
          assert.jsonSchema(warnings[0].origin, originSchema)
        )
      )
    )
  )

  describe('with enum parameter', ->
    err = undefined
    transaction = undefined

    fixtures.enumParameter.forEachDescribe(({source}) ->
      beforeEach((done) ->
        compileFixture(source, (args...) ->
          [err, compilationResult] = args
          transaction = compilationResult.transactions[0]
          done()
        )
      )

      it('expands the request URI with the first enum value', ->
        assert.equal(transaction.request.uri, '/honey?beekeeper=Adam')
      )
    )
  )

  describe('with response schema', ->
    err = undefined
    transaction = undefined

    fixtures.responseSchema.forEachDescribe(({source}) ->
      beforeEach((done) ->
        compileFixture(source, (args...) ->
          [err, compilationResult] = args
          transaction = compilationResult.transactions[0]
          done()
        )
      )

      it('provides the body in response data', ->
        assert.ok(transaction.response.body)
        assert.doesNotThrow( -> JSON.parse(transaction.response.body))
      )
      it('provides the schema in response data', ->
        assert.ok(transaction.response.schema)
        assert.doesNotThrow( -> JSON.parse(transaction.response.schema))
      )
    )
  )

  describe('with inheritance of URI parameters', ->
    err = undefined
    transaction = undefined

    fixtures.parametersInheritance.forEachDescribe(({source}) ->
      beforeEach((done) ->
        compileFixture(source, (args...) ->
          [err, compilationResult] = args
          transaction = compilationResult.transactions[0]
          done()
        )
      )

      it('expands the request URI using correct inheritance cascade', ->
        assert.equal(transaction.request.uri, '/honey?beekeeper=Honza&amount=42')
      )
    )
  )

  describe('with different default value and first enum value of URI parameter', ->
    err = undefined
    transaction = undefined

    fixtures.preferDefault.forEachDescribe(({source}) ->
      beforeEach((done) ->
        compileFixture(source, (args...) ->
          [err, compilationResult] = args
          transaction = compilationResult.transactions[0]
          done()
        )
      )

      it('expands the request URI using the default value', ->
        assert.equal(transaction.request.uri, '/honey?beekeeper=Adam')
      )
    )
  )

  describe('valid API description', ->
    err = undefined
    compilationResult = undefined
    filename = 'apiDescription.ext'

    compilationResultSchema = createCompilationResultSchema({
      filename
      transactions: true
      paths: false
    })

    fixtures.ordinary.forEachDescribe(({source}) ->
      beforeEach((done) ->
        compileFixture(source, {filename}, (args...) ->
          [err, compilationResult] = args
          done()
        )
      )

      it('is compiled into a compilation result of expected structure', ->
        assert.jsonSchema(compilationResult, compilationResultSchema)
      )
    )
  )
)
