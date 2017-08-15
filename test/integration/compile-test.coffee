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
    compilationResult = undefined
    filename = 'apiDescription.ext'

    compilationResultSchema = createCompilationResultSchema({
      filename
      transactions: true
      paths: false
      mediaType: false
    })

    fixtures.ordinary.forEachDescribe(({source}) ->
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
      errors = undefined
      transactions = undefined

      beforeEach((done) ->
        compileFixture(source, (err, compilationResult) ->
          return done(err) if err
          {errors, transactions} = compilationResult
          done()
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

    errors = undefined
    transactions = undefined

    fixtures.uriExpansionAnnotation.forEachDescribe(({source}) ->
      beforeEach((done) ->
        compileFixture(source, (err, compilationResult) ->
          return done(err) if err
          {errors, transactions} = compilationResult
          done()
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
    errors = undefined
    transactions = undefined

    fixtures.uriValidationAnnotation.forEachDescribe(({source}) ->
      beforeEach((done) ->
        compileFixture(source, (err, compilationResult) ->
          return done(err) if err
          {errors, transactions} = compilationResult
          done()
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
          assert.include(errors[0].message.toLowerCase(), 'no example')
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
      warnings = undefined
      transactions = undefined

      beforeEach((done) ->
        compileFixture(source, (err, compilationResult) ->
          return done(err) if err
          {warnings, transactions} = compilationResult
          done()
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

    warnings = undefined
    transactions = undefined
    message = '... dummy warning message ...'

    stubs =
      './compile-uri': proxyquire('../../src/compile-uri',
        './expand-uri-template': (args...) ->
          {uri: '/honey?beekeeper=Honza', errors: [], warnings: [message]}
      )

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

    warnings = undefined
    transactions = undefined

    fixtures.ambiguousParametersAnnotation.forEachDescribe(({source}) ->
      beforeEach((done) ->
        compileFixture(source, (err, compilationResult) ->
          return done(err) if err
          {warnings, transactions} = compilationResult
          done()
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
    # Since 'validateParams' doesn't actually return any warnings
    # (but could in the future), we need to pretend it's possible for this
    # test.

    warnings = undefined
    transactions = undefined
    message = '... dummy warning message ...'

    stubs =
      './compile-uri': proxyquire('../../src/compile-uri',
        './validate-params': (args...) ->
          {errors: [], warnings: [message]}
      )

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
    transaction = undefined

    fixtures.enumParameter.forEachDescribe(({source}) ->
      beforeEach((done) ->
        compileFixture(source, (args...) ->
          [err, compilationResult] = args
          transaction = compilationResult.transactions[0]
          done(err)
        )
      )

      it('expands the request URI with the first enum value', ->
        assert.equal(transaction.request.uri, '/honey?beekeeper=Adam')
      )
    )
  )

  describe('with parameter having an example value', ->
    transaction = undefined

    fixtures.exampleParameter.forEachDescribe(({source}) ->
      beforeEach((done) ->
        compileFixture(source, (args...) ->
          [err, compilationResult] = args
          transaction = compilationResult.transactions[0]
          done(err)
        )
      )

      it('expands the request URI with the example value', ->
        assert.equal(transaction.request.uri, '/honey?beekeeper=Honza&flavour=sweet')
      )
    )
  )

  describe('with response schema', ->
    transaction = undefined

    fixtures.responseSchema.forEachDescribe(({source}) ->
      beforeEach((done) ->
        compileFixture(source, (args...) ->
          [err, compilationResult] = args
          transaction = compilationResult.transactions[0]
          done(err)
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
    transaction = undefined

    fixtures.parametersInheritance.forEachDescribe(({source}) ->
      beforeEach((done) ->
        compileFixture(source, (args...) ->
          [err, compilationResult] = args
          transaction = compilationResult.transactions[0]
          done(err)
        )
      )

      it('expands the request URI using correct inheritance cascade', ->
        assert.equal(transaction.request.uri, '/honey?beekeeper=Honza&amount=42')
      )
    )
  )

  describe('with different default value and first enum value of URI parameter', ->
    transaction = undefined

    fixtures.preferDefault.forEachDescribe(({source}) ->
      beforeEach((done) ->
        compileFixture(source, (args...) ->
          [err, compilationResult] = args
          transaction = compilationResult.transactions[0]
          done(err)
        )
      )

      it('expands the request URI using the default value', ->
        assert.equal(transaction.request.uri, '/honey?beekeeper=Adam')
      )
    )
  )

  describe('with default value for a required URI parameter', ->
    errors = undefined
    warnings = undefined
    warning = undefined
    transactions = undefined

    fixtures.defaultRequired.forEachDescribe(({source}) ->
      beforeEach((done) ->
        compileFixture(source, (args...) ->
          [err, compilationResult] = args
          {errors, warnings, transactions} = compilationResult
          [warning] = warnings[-1..] # the last warning
          done(err)
        )
      )

      it('expands the request URI using the default value', ->
        assert.equal(transactions[0].request.uri, '/honey?beekeeper=Honza')
      )
      it('is compiled with no errors', ->
        assert.equal(errors.length, 0)
      )
      it('is compiled with warnings', ->
        assert.ok(warnings.length)
      )
      it('there are no other warnings than from parser or URI expansion', ->
        assert.equal(warnings.filter((w) ->
          w.component isnt 'uriTemplateExpansion' and
          w.component isnt 'apiDescriptionParser'
        ).length, 0)
      )
      context('the last warning', ->
        it('comes from URI expansion', ->
          assert.equal(warning.component, 'uriTemplateExpansion')
        )
        it('has no code', ->
          assert.isUndefined(warning.code)
        )
        it('has message', ->
          assert.include(warning.message.toLowerCase(), 'default value for a required parameter')
        )
        it('has no location', ->
          assert.isUndefined(warning.location)
        )
        it('has origin', ->
          assert.jsonSchema(warning.origin, originSchema)
        )
      )
    )
  )

  describe('with HTTP headers', ->
    transaction = undefined

    fixtures.httpHeaders.forEachDescribe(({source}) ->
      beforeEach((done) ->
        compileFixture(source, (args...) ->
          [err, compilationResult] = args
          transaction = compilationResult.transactions[0]
          done(err)
        )
      )

      context('compiles a transaction', ->
        it('with expected request headers', ->
          assert.deepEqual(transaction.request.headers, {
            'Content-Type': {value: 'application/json'}
            'Accept': {value: 'application/json'}
          })
        )
        it('with expected response headers', ->
          assert.deepEqual(transaction.response.headers, {
            'Content-Type': {value: 'application/json'}
            'X-Test': {value: 'Adam'}
          })
        )
      )
    )
  )
)
