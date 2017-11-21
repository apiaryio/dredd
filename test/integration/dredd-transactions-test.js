sinon = require('sinon')
proxyquire = require('proxyquire').noPreserveCache()

fixtures = require('../fixtures')
{assert} = require('../utils')
createCompilationResultSchema = require('../schemas/compilation-result')
createAnnotationSchema = require('../schemas/annotation')
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
        assert.jsonSchema(compilationResult.annotations[0], createAnnotationSchema(
          type: 'warning'
          component: 'apiDescriptionParser'
          message: 'to API Blueprint'
        ))
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
      assert.jsonSchema(compilationResult.annotations[0], createAnnotationSchema(
        type: 'warning'
        component: 'apiDescriptionParser'
        message: 'to API Blueprint'
      ))
    )
    it('produces a warning about the API Blueprint not being valid', ->
      assert.jsonSchema(compilationResult.annotations[1], createAnnotationSchema(
        type: 'warning'
        component: 'apiDescriptionParser'
        message: 'expected'
      ))
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

    it('produces two annotations', ->
      assert.jsonSchema(compilationResult, createCompilationResultSchema(
        annotations: 2
      ))
    )
    it('produces no errors', ->
      errors = compilationResult.annotations.filter((annotation) ->
        annotation.type is 'error'
      )
      assert.deepEqual(errors, [])
    )
    it('produces a warning about falling back to API Blueprint', ->
      assert.jsonSchema(compilationResult.annotations[0], createAnnotationSchema(
        type: 'warning'
        component: 'apiDescriptionParser'
        message: 'to API Blueprint'
      ))
    )
    it('produces a warning about missing HTTP status code', ->
      # "+ Response XXX" would be a match in the API Blueprint detection,
      # so the fixture omits the HTTP status code to prevent that
      assert.jsonSchema(compilationResult.annotations[1], createAnnotationSchema(
        type: 'warning'
        component: 'apiDescriptionParser'
        message: 'missing response HTTP status code'
      ))
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
          annotations: [1]
          transactions: 0
        ))
      )
      it('produces errors', ->
        assert.jsonSchema(compilationResult.annotations,
          type: 'array'
          items: createAnnotationSchema({type: 'error'})
        )
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

      it('produces some annotations', ->
        assert.jsonSchema(compilationResult, createCompilationResultSchema(
          annotations: [1]
        ))
      )
      it('produces warnings', ->
        assert.jsonSchema(compilationResult.annotations,
          type: 'array'
          items: createAnnotationSchema({type: 'warning'})
        )
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

      it('produces no annotations and some transactions', ->
        assert.jsonSchema(compilationResult, createCompilationResultSchema())
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
      assert.jsonSchema(compilationResult.annotations[0], createAnnotationSchema(
        type: 'error'
        message: message
      ))
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
      assert.jsonSchema(compilationResult.annotations[0], createAnnotationSchema(
        type: 'error'
        message: message
      ))
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
    it('produces an error about parser failure', ->
      assert.jsonSchema(compilationResult.annotations[0], createAnnotationSchema(
        type: 'error'
        message: 'parser was unable to provide a valid parse result'
      ))
    )
  )
)
