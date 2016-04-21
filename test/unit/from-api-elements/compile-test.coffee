
{assert} = require('chai')
protagonist = require('protagonist')
fs = require('fs')
path = require('path')
tv4 = require('tv4')
proxyquire = require('proxyquire').noPreserveCache()

compileFromApiElements = require('../../../src/from-api-elements/compile')


compile = (apiDescriptionDocument, filename, done) ->
  [done, filename] = [filename, undefined] if typeof filename is 'function'

  options = {type: 'refract', generateSourceMap: true}
  protagonist.parse(apiDescriptionDocument, options, (err, parseResult) ->
    return done(err) unless parseResult
    done(null, compileFromApiElements(parseResult, filename))
  )


describe('compileFromApiElements()', ->
  describe('API description causing an error in the parser', ->
    err = undefined
    errors = undefined

    beforeEach((done) ->
      compile('''
        FORMAT: 1A
        # Beehive API
        \t\t
      ''', (args...) ->
        [err, compilationResult] = args
        errors = compilationResult.errors
        done()
      )
    )

    it('is compiled with an error', ->
      assert.equal(errors.length, 1)
    )
    context('the error', ->
      it('comes from parser', ->
        assert.equal(errors[0].component, 'apiDescriptionParser')
      )
      it('has code', ->
        assert.ok(errors[0].code)
      )
      it('has message', ->
        assert.include(errors[0].message.toLowerCase(), 'tab')
      )
      it('has expected location', ->
        assert.deepEqual(errors[0].location, [[25, 1]])
      )
      it('has no origin', ->
        assert.isUndefined(errors[0].origin)
      )
    )
  )

  describe('API description causing an error in URI expansion', ->
    err = undefined
    errors = undefined

    beforeEach((done) ->
      compile('''
        FORMAT: 1A
        # Beehive API
        ## Honey [/honey{]
        ### Remove [DELETE]
        + Response
      ''', (args...) ->
        [err, compilationResult] = args
        errors = compilationResult.errors
        done()
      )
    )

    it('is compiled with an error', ->
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
        assert.include(errors[0].message.toLowerCase(), 'uri template')
      )
      it('has no location', ->
        assert.isUndefined(errors[0].location)
      )
      it('has origin', ->
        assert.deepEqual(errors[0].origin,
          filename: null
          apiName: 'Beehive API'
          resourceGroupName: ''
          resourceName: 'Honey'
          actionName: 'Remove'
          exampleName: ''
        )
      )
    )
  )

  describe('API description causing an error in URI validation', ->
    err = undefined
    errors = undefined

    beforeEach((done) ->
      compile('''
        FORMAT: 1A
        # Beehive API
        ## Honey [/honey{?param}]
        ### Remove [DELETE]
        + Parameters
            + nonexisting (string, required)
        + Response
      ''', (args...) ->
        [err, compilationResult] = args
        errors = compilationResult.errors
        done()
      )
    )

    it('is compiled with an error', ->
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
        assert.deepEqual(errors[0].origin,
          filename: null
          apiName: 'Beehive API'
          resourceGroupName: ''
          resourceName: 'Honey'
          actionName: 'Remove'
          exampleName: ''
        )
      )
    )
  )

  describe('API description causing a warning in the parser', ->
    err = undefined
    warnings = undefined

    beforeEach((done) ->
      compile('''
        FORMAT: 1A
        # Beehive API
        ## Honey [/honey]
        ### Remove [DELETE]
        + Response
      ''', (args...) ->
        [err, compilationResult] = args
        warnings = compilationResult.warnings
        done()
      )
    )

    it('is compiled with a warning', ->
      assert.equal(warnings.length, 1)
    )
    context('the warning', ->
      it('comes from parser', ->
        assert.equal(warnings[0].component, 'apiDescriptionParser')
      )
      it('has code', ->
        assert.ok(warnings[0].code)
      )
      it('has message', ->
        assert.include(warnings[0].message.toLowerCase(), 'status code')
      )
      it('has expected location', ->
        assert.deepEqual(warnings[0].location, [[63, 10]])
      )
      it('has no origin', ->
        assert.isUndefined(warnings[0].origin)
      )
    )
  )

  describe('API description causing a warning in URI expansion', ->
    err = undefined
    warnings = undefined

    beforeEach((done) ->
      compile('''
        FORMAT: 1A
        # Beehive API
        ## Honey [/honey{?beekeeper}]
        ### Remove [DELETE]
        + Response 203
      ''', (args...) ->
        [err, compilationResult] = args
        warnings = compilationResult.warnings
        done()
      )
    )

    it('is compiled with a warning', ->
      assert.equal(warnings.length, 1)
    )
    context('the warning', ->
      it('comes from parser', ->
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
        assert.deepEqual(warnings[0].origin,
          filename: null
          apiName: 'Beehive API'
          resourceGroupName: ''
          resourceName: 'Honey'
          actionName: 'Remove'
          exampleName: ''
        )
      )
    )
  )

  describe('API description causing a warning in URI validation', ->
    err = undefined
    warnings = undefined

    apiDescriptionDocument = '''
      FORMAT: 1A
      # Beehive API
      ## Honey [/honey{?beekeeper}]
      + Parameters
          + beekeeper: Honza (string)
      ### Remove [DELETE]
      + Request (application/json)
      + Response 200
    '''
    message = '... dummy warning message ...'

    # Since validateParameters doesn't actually return any warnings, we need to
    # pretend it's possible for this test.
    beforeEach((done) ->
      stubbedCompileFromApiElements = proxyquire('../../../src/from-api-elements/compile',
        '../validate-parameters': (args...) ->
          {errors: [], warnings: [message]}
      )

      options = {type: 'refract', generateSourceMap: true}
      protagonist.parse(apiDescriptionDocument, options, (err, parseResult) ->
        return done(err) unless parseResult
        warnings = stubbedCompileFromApiElements(parseResult, null).warnings
        done()
      )
    )

    it('is compiled with a warning', ->
      assert.equal(warnings.length, 1)
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
        assert.deepEqual(warnings[0].origin,
          filename: null
          apiName: 'Beehive API'
          resourceGroupName: ''
          resourceName: 'Honey'
          actionName: 'Remove'
          exampleName: ''
        )
      )
    )
  )

  describe('API description with multiple transaction examples', ->
    err = undefined
    transactions = undefined
    exampleNumbersPerTransaction = [1, 1, 2]

    beforeEach((done) ->
      compile('''
        FORMAT: 1A
        # Beehive API
        ## Honey [/honey]
        ### Remove [DELETE]
        + Request (application/json)
        + Response 200
        + Response 500
        + Request (text/plain)
        + Response 415
      ''', (args...) ->
        [err, compilationResult] = args
        transactions = compilationResult.transactions
        done()
      )
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

  describe('API description without multiple transaction examples', ->
    err = undefined
    compilationResult = undefined
    transaction = undefined

    beforeEach((done) ->
      compile('''
        FORMAT: 1A
        # Beehive API
        ## Honey [/honey]
        ### Remove [DELETE]
        + Request (application/json)
        + Response 200
      ''', (args...) ->
        [err, compilationResult] = args
        transaction = compilationResult.transactions[0]
        done()
      )
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

  describe('API description with arbitrary action', ->
    filename = path.join(__dirname, '../../fixtures/arbitrary-action.apib')
    apiDescriptionDocument = fs.readFileSync(filename).toString()

    err = undefined
    transaction0 = undefined
    transaction1 = undefined

    beforeEach((done) ->
      compile(apiDescriptionDocument, filename, (args...) ->
        [err, compilationResult] = args
        [transaction0, transaction1] = compilationResult.transactions
        done()
      )
    )

    context('action within a resource', ->
      it('has URI inherited from the resource', ->
        assert.equal(transaction0.request.uri, '/resource/1')
      )
      it('has its method', ->
        assert.equal(transaction0.request.method, 'POST')
      )
    )

    context('arbitrary action', ->
      it('has its own URI', ->
        assert.equal(transaction1.request.uri, '/resource-cool-url/othervalue')
      )
      it('has its method', ->
        assert.equal(transaction1.request.method, 'GET')
      )
    )
  )

  describe('API description without sections', ->
    filename = path.join(__dirname, '../../fixtures/simple-unnamed.apib')
    apiDescriptionDocument = fs.readFileSync(filename).toString()

    err = undefined
    transaction = undefined

    beforeEach((done) ->
      compile(apiDescriptionDocument, filename, (args...) ->
        [err, compilationResult] = args
        transaction = compilationResult.transactions[0]
        done()
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

  describe('API description with enum parameter', ->
    err = undefined
    transaction = undefined

    beforeEach((done) ->
      compile('''
        FORMAT: 1A
        # Beehive API
        ## Honey [/honey{?beekeeper}]
        + Parameters
            + beekeeper (enum[string])
                + Members
                    + Adam
                    + Honza
        ### Remove [DELETE]
        + Request (application/json)
        + Response 200
      ''', (args...) ->
        [err, compilationResult] = args
        transaction = compilationResult.transactions[0]
        done()
      )
    )

    it('expands the request URI with the first enum value', ->
      assert.equal(transaction.request.uri, '/honey?beekeeper=Adam')
    )
  )

  describe('API description with response schema', ->
    err = undefined
    transaction = undefined

    beforeEach((done) ->
      compile('''
        FORMAT: 1A
        # Beehive API
        ## Honey [/honey]
        ### Remove [DELETE]
        + Request (application/json)
        + Response 200
            + Body

                    []

            + Schema

                    {"type": "array"}
      ''', (args...) ->
        [err, compilationResult] = args
        transaction = compilationResult.transactions[0]
        done()
      )
    )

    it('provides the body in response data', ->
      assert.deepEqual(
        JSON.parse(transaction.response.body),
        []
      )
    )
    it('provides the schema in response data', ->
      assert.deepEqual(
        JSON.parse(transaction.response.schema),
        {type: 'array'}
      )
    )
  )

  describe('API description with inheritance of URI parameters', ->
    err = undefined
    transaction = undefined

    beforeEach((done) ->
      compile('''
        FORMAT: 1A
        # Beehive API
        ## Honey [/honey{?beekeeper,amount}]
        + Parameters
            + beekeeper: Adam (string)
        ### Remove [DELETE]
        + Parameters
            + amount: 42 (number)
        + Request (application/json)
            + Parameters
                + beekeeper: Honza (string)
        + Response 200
      ''', (args...) ->
        [err, compilationResult] = args
        transaction = compilationResult.transactions[0]
        done()
      )
    )

    it('expands the request URI using correct inheritance cascade', ->
      assert.equal(transaction.request.uri, '/honey?beekeeper=Honza&amount=42')
    )
  )

  describe('Valid API description', ->
    filename = path.join(__dirname, '../../fixtures/blueprint.apib')
    apiDescriptionDocument = fs.readFileSync(filename).toString()

    requestSchema =
      type: 'object'
      properties:
        uri: {type: 'string', pattern: '^/'}
        method: {type: 'string'}
        headers:
          type: 'object'
          patternProperties:
            '': # property of any name
              type: 'object'
              properties:
                value: {type: 'string'}
        body: {type: 'string'}

    responseSchema =
      type: 'object'
      properties:
        status: {type: 'string'}
        headers:
          type: 'object'
          patternProperties:
            '': # property of any name
              type: 'object'
              properties:
                value: {type: 'string'}
        body: {type: 'string'}

    originSchema =
      type: 'object'
      properties:
        filename: {type: 'string', enum: [filename]}
        apiName: {type: 'string'}
        resourceGroupName: {type: 'string'}
        resourceName: {type: 'string'}
        actionName: {type: 'string'}
        exampleName: {type: 'string'}

    pathOriginSchema =
      type: 'object'
      properties:
        apiName: {type: 'string'}
        resourceGroupName: {type: 'string'}
        resourceName: {type: 'string'}
        actionName: {type: 'string'}
        exampleName: {type: 'string'}

    transactionSchema =
      type: 'object'
      properties:
        request: requestSchema
        response: responseSchema
        origin: originSchema
        pathOrigin: pathOriginSchema

    schema =
      type: 'object'
      properties:
        transactions: {type: 'array', items: transactionSchema}
        errors: {type: 'array', maxItems: 0} # 0 = no errors occured
        warnings: {type: 'array', maxItems: 0} # 0 = no warnings occured

    err = undefined
    compilationResult = undefined
    validationResult = undefined

    beforeEach((done) ->
      compile(apiDescriptionDocument, filename, (args...) ->
        [err, compilationResult] = args
        validationResult = tv4.validateMultiple(compilationResult, schema)
        done()
      )
    )

    it('is compiled into a compilation result of expected structure', ->
      errors = (
        {message, dataPath} for {message, dataPath} in validationResult.errors
      )
      assert.deepEqual(errors, [])
      assert.isTrue(validationResult.valid)
    )
  )
)
