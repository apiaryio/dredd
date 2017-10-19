
sinon = require('sinon')
proxyquire = require('proxyquire').noPreserveCache()

fixtures = require('../fixtures')
{assert} = require('../utils')
createCompilationResultSchema = require('../schemas/compilation-result')
dreddTransactions = require('../../src/index')


describe('Dredd Transactions', ->
  describe('When compilation throws an exception', ->
    err = undefined
    error = new Error('... dummy message ...')
    compilationResult = undefined

    beforeEach((done) ->
      dt = proxyquire('../../src/index',
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

  describe('When given empty API description document', ->
    compilationResult = undefined

    fixtures.empty.forEachDescribe(({source}) ->
      beforeEach((done) ->
        dreddTransactions.compile(source, null, (args...) ->
          [err, compilationResult] = args
          done(err)
        )
      )

      it('produces one annotation, no transactions', ->
        assert.jsonSchema(compilationResult, createCompilationResultSchema(
          annotations: 1
          transactions: 0
        ))
      )
      it('produces warning about falling back to API Blueprint', ->
        assert.equal(compilationResult.annotations[0].type, 'warning')
        assert.include(
          compilationResult.annotations[0].message,
          'to API Blueprint'
        )
      )
    )
  )

  describe('When given unknown API description format', ->
    compilationResult = undefined
    source = '''
      ... unknown API description format ...
    '''

    beforeEach((done) ->
      dreddTransactions.compile(source, null, (args...) ->
        [err, compilationResult] = args
        done(err)
      )
    )

    it('produces two annotations, no transactions', ->
      assert.jsonSchema(compilationResult, createCompilationResultSchema(
        annotations: 2
        transactions: 0
      ))
    )
    it('produces warning about falling back to API Blueprint', ->
      assert.equal(compilationResult.annotations[0].type, 'warning')
      assert.include(
        compilationResult.annotations[0].message,
        'to API Blueprint'
      )
    )
    it('produces a warning about the API Blueprint not being valid', ->
      assert.equal(compilationResult.annotations[1].type, 'warning')
      assert.include(
        compilationResult.annotations[1].message,
        'expected'
      )
    )
  )

  describe('When given unrecognizable API Blueprint format', ->
    compilationResult = undefined
    source = fixtures.unrecognizable.apiBlueprint

    beforeEach((done) ->
      dreddTransactions.compile(source, null, (args...) ->
        [err, compilationResult] = args
        done(err)
      )
    )

    it('produces some annotations, some transactions', ->
      assert.jsonSchema(compilationResult, createCompilationResultSchema(
        annotations: true
        transactions: true
      ))
    )
    it('produces no errors', ->
      errors = compilationResult.annotations.filter((annotation) ->
        annotation.type is 'error'
      )
      assert.deepEqual(errors, [])
    )
    it('produces a warning about falling back to API Blueprint', ->
      warnings = compilationResult.annotations.filter((annotation) ->
        annotation.type is 'warning' and
        annotation.message.indexOf('to API Blueprint') isnt -1
      )
      assert.equal(warnings.length, 1)
    )
  )

  describe('When given API description with errors', ->
    compilationResult = undefined

    fixtures.parserError.forEachDescribe(({source}) ->
      beforeEach((done) ->
        dreddTransactions.compile(source, null, (args...) ->
          [err, compilationResult] = args
          done(err)
        )
      )

      it('produces some annotations, no transactions', ->
        assert.jsonSchema(compilationResult, createCompilationResultSchema(
          annotations: true
          transactions: 0
        ))
      )
      it('produces some errors', ->
        errors = compilationResult.annotations.filter((annotation) ->
          annotation.type is 'error'
        )
        assert.ok(errors.length)
      )
      it('produces no warnings', ->
        warnings = compilationResult.annotations.filter((annotation) ->
          annotation.type is 'warning'
        )
        assert.deepEqual(warnings, [])
      )
    )
  )

  describe('When given API description with warnings', ->
    compilationResult = undefined

    fixtures.parserWarning.forEachDescribe(({source}) ->
      beforeEach((done) ->
        dreddTransactions.compile(source, null, (args...) ->
          [err, compilationResult] = args
          done(err)
        )
      )

      it('produces some annotations, some transactions', ->
        assert.jsonSchema(compilationResult, createCompilationResultSchema(
          annotations: true
          transactions: true
        ))
      )
      it('produces no errors', ->
        errors = compilationResult.annotations.filter((annotation) ->
          annotation.type is 'error'
        )
        assert.deepEqual(errors, [])
      )
      it('produces some warnings', ->
        warnings = compilationResult.annotations.filter((annotation) ->
          annotation.type is 'warning'
        )
        assert.ok(warnings.length)
      )
    )
  )

  describe('When given valid API description', ->
    compilationResult = undefined

    fixtures.ordinary.forEachDescribe(({source}) ->
      beforeEach((done) ->
        dreddTransactions.compile(source, null, (args...) ->
          [err, compilationResult] = args
          done(err)
        )
      )

      it('produces no annotations, some transactions', ->
        assert.jsonSchema(compilationResult, createCompilationResultSchema(
          annotations: 0
          transactions: true
        ))
      )
    )
  )

  describe('When parser unexpectedly provides just error and no API Elements', ->
    compilationResult = undefined
    source = '... dummy API description document ...'
    message = '... dummy error message ...'

    beforeEach((done) ->
      dt = proxyquire('../../src/index',
        './parse': (input, callback) ->
          callback(new Error(message))
      )
      dt.compile(source, null, (args...) ->
        [err, compilationResult] = args
        done(err)
      )
    )

    it('produces one annotation, no transactions', ->
      assert.jsonSchema(compilationResult, createCompilationResultSchema(
        annotations: 1
        transactions: 0
      ))
    )
    it('turns the parser error into a valid annotation', ->
      assert.equal(compilationResult.annotations[0].message, message)
    )
  )

  describe('When parser unexpectedly provides error and malformed API Elements', ->
    compilationResult = undefined
    source = '... dummy API description document ...'
    message = '... dummy error message ...'

    beforeEach((done) ->
      dt = proxyquire('../../src/index',
        './parse': (input, callback) ->
          callback(new Error(message), {dummy: true})
      )
      dt.compile(source, null, (args...) ->
        [err, compilationResult] = args
        done(err)
      )
    )

    it('produces one annotation, no transactions', ->
      assert.jsonSchema(compilationResult, createCompilationResultSchema(
        annotations: 1
        transactions: 0
      ))
    )
    it('turns the parser error into a valid annotation', ->
      assert.equal(compilationResult.annotations[0].message, message)
    )
  )

  describe('When parser unexpectedly provides malformed API Elements only', ->
    compilationResult = undefined
    source = '... dummy API description document ...'

    beforeEach((done) ->
      dt = proxyquire('../../src/index',
        './parse': (input, callback) ->
          callback(null, {dummy: true})
      )
      dt.compile(source, null, (args...) ->
        [err, compilationResult] = args
        done(err)
      )
    )

    it('produces one annotation, no transactions', ->
      assert.jsonSchema(compilationResult, createCompilationResultSchema(
        annotations: 1
        transactions: 0
      ))
    )
    it('the annotation is an error', ->
      assert.equal(compilationResult.annotations[0].type, 'error')
    )
    it('the annotation is about parser failure', ->
      assert.include(
        compilationResult.annotations[0].message,
        'parser was unable to provide a valid parse result'
      )
    )
  )
)
