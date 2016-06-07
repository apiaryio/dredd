
fixtures = require('../fixtures')
{assert} = require('../utils')
createCompilationResultSchema = require('../schemas/compilation-result')
dreddTransactions = require('../../src/dredd-transactions')


describe('Dredd Transactions', ->
  describe('When given no input', ->
    compilationResult = undefined
    schema = createCompilationResultSchema(
      errors: 0
      warnings: 1
      transactions: 0
    )

    fixtures.empty.forEachDescribe(({source}) ->
      beforeEach((done) ->
        dreddTransactions.compile(source, null, (args...) ->
          [err, compilationResult] = args
          done(err)
        )
      )

      it('produces no errors, one warning, no transactions', ->
        assert.jsonSchema(compilationResult, schema)
      )
      it('produces warning about falling back to API Blueprint', ->
        assert.include(
          JSON.stringify(compilationResult.warnings),
          'to API Blueprint'
        )
      )
    )
  )

  describe('When given unknown API description format', ->
    compilationResult = undefined
    schema = createCompilationResultSchema(
      errors: 0
      warnings: true
      transactions: 0
    )
    source = '''
      ... unknown API description format ...
    '''

    beforeEach((done) ->
      dreddTransactions.compile(source, null, (args...) ->
        [err, compilationResult] = args
        done(err)
      )
    )

    it('produces no errors, one warning, no transactions', ->
      assert.jsonSchema(compilationResult, schema)
    )
    it('produces warning about falling back to API Blueprint', ->
      assert.include(
        JSON.stringify(compilationResult.warnings),
        'to API Blueprint'
      )
    )
  )

  describe('When given unrecognizable API Blueprint format', ->
    compilationResult = undefined
    schema = createCompilationResultSchema(
      errors: 0
      warnings: true
      transactions: true
    )
    source = fixtures.unrecognizable.apiBlueprint

    beforeEach((done) ->
      dreddTransactions.compile(source, null, (args...) ->
        [err, compilationResult] = args
        done(err)
      )
    )

    it('produces no errors, some warnings, some transactions', ->
      assert.jsonSchema(compilationResult, schema)
    )
    it('produces warning about falling back to API Blueprint', ->
      assert.include(
        JSON.stringify(compilationResult.warnings),
        'to API Blueprint'
      )
    )
  )

  describe('When given API description with errors', ->
    compilationResult = undefined
    schema = createCompilationResultSchema(
      errors: true
      warnings: 0
      transactions: 0
    )

    fixtures.parserError.forEachDescribe(({source}) ->
      beforeEach((done) ->
        dreddTransactions.compile(source, null, (args...) ->
          [err, compilationResult] = args
          done(err)
        )
      )

      it('produces some errors, no warnings, no transactions', ->
        assert.jsonSchema(compilationResult, schema)
      )
    )
  )

  describe('When given API description with warnings', ->
    compilationResult = undefined
    schema = createCompilationResultSchema(
      errors: 0
      warnings: true
      transactions: true
    )

    fixtures.parserWarning.forEachDescribe(({source}) ->
      beforeEach((done) ->
        dreddTransactions.compile(source, null, (args...) ->
          [err, compilationResult] = args
          done(err)
        )
      )

      it('produces no errors, some warnings, some transactions', ->
        assert.jsonSchema(compilationResult, schema)
      )
    )
  )

  describe('When given valid API description', ->
    compilationResult = undefined
    schema = createCompilationResultSchema(
      errors: 0
      warnings: 0
      transactions: true
    )

    fixtures.ordinary.forEachDescribe(({source}) ->
      beforeEach((done) ->
        dreddTransactions.compile(source, null, (args...) ->
          [err, compilationResult] = args
          done(err)
        )
      )

      it('produces no errors, no warnings, some transactions', ->
        assert.jsonSchema(compilationResult, schema)
      )
    )
  )
)
