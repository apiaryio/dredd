
sinon = require('sinon')
proxyquire = require('proxyquire').noPreserveCache()

fixtures = require('../fixtures')
{assert} = require('../utils')
createCompilationResultSchema = require('../schemas/compilation-result')
dreddTransactions = require('../../src/dredd-transactions')


describe('Dredd Transactions', ->
  describe('When compilation throws an exception', ->
    err = undefined
    error = new Error('... dummy message ...')
    compilationResult = undefined
    schema = createCompilationResultSchema(
      errors: 1
      warnings: 0
      transactions: 0
    )

    beforeEach((done) ->
      dt = proxyquire('../../src/dredd-transactions',
        './compile': (args...) -> throw error
      )
      dt.compile('... dummy API description document ...', null, (args...) ->
        [err, compilationResult] = args
        done()
      )
    )

    it('passes the error to callback', ->
      assert.equal(err, error)
    )
    it('passes no compilation result to callback', ->
      assert.isUndefined(compilationResult)
    )
  )

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

  describe('When parser unexpectedly provides just error and no API Elements', ->
    compilationResult = undefined
    schema = createCompilationResultSchema(
      errors: 1
      warnings: 0
      transactions: 0
    )
    source = '... dummy API description document ...'
    message = '... dummy error message ...'

    beforeEach((done) ->
      dt = proxyquire('../../src/dredd-transactions',
        './parse': (input, callback) ->
          callback(new Error(message))
      )
      dt.compile(source, null, (args...) ->
        [err, compilationResult] = args
        done(err)
      )
    )

    it('produces one error, no warnings, no transactions', ->
      assert.jsonSchema(compilationResult, schema)
    )
    it('turns the parser error into a valid annotation', ->
      assert.include(
        JSON.stringify(compilationResult.errors),
        message
      )
    )
  )
)
