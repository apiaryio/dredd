
sinon = require('sinon')
fury = require('fury')
{assert} = require('../utils')

fixtures = require('../fixtures')
parse = require('../../src/parse')


describe('Parsing API description document', ->
  reMediaType = /\w+\/[\w\.\+]+/

  describe('Valid document gets correctly parsed', ->
    fixtures.ordinary.forEachDescribe(({source}) ->
      error = undefined
      mediaType = undefined
      apiElements = undefined

      beforeEach((done) ->
        parse(source, (args...) ->
          [error, {mediaType, apiElements}] = args
          done()
        )
      )

      it('produces no error', ->
        assert.isNull(error)
      )
      it('produces API Elements', ->
        assert.isObject(apiElements)
      )
      it('produces media type', ->
        assert.match(mediaType, reMediaType)
      )
      it('the parse result is in the API Elements format', ->
        assert.equal(apiElements.element, 'parseResult')
        assert.isArray(apiElements.content)
      )
      it('the parse result contains no annotation elements', ->
        assert.notInclude(JSON.stringify(apiElements), '"annotation"')
      )
      it('the parse result contains source map elements', ->
        assert.include(JSON.stringify(apiElements), '"sourceMap"')
      )
    )
  )

  describe('Invalid document causes error', ->
    fixtures.parserError.forEachDescribe(({source}) ->
      error = undefined
      mediaType = undefined
      apiElements = undefined

      beforeEach((done) ->
        parse(source, (args...) ->
          [error, {mediaType, apiElements}] = args
          done()
        )
      )

      it('produces error', ->
        assert.instanceOf(error, Error)
      )
      it('produces API Elements', ->
        assert.isObject(apiElements)
      )
      it('produces media type', ->
        assert.match(mediaType, reMediaType)
      )
      it('the parse result contains annotation element', ->
        assert.include(JSON.stringify(apiElements), '"annotation"')
      )
      it('the annotation is an error', ->
        assert.include(JSON.stringify(apiElements), '"error"')
      )
    )
  )

  describe('Defective document causes warning', ->
    fixtures.parserWarning.forEachDescribe(({source}) ->
      error = undefined
      mediaType = undefined
      apiElements = undefined

      beforeEach((done) ->
        parse(source, (args...) ->
          [error, {mediaType, apiElements}] = args
          done()
        )
      )

      it('produces no error', ->
        assert.isNull(error)
      )
      it('produces API Elements', ->
        assert.isObject(apiElements)
      )
      it('produces media type', ->
        assert.match(mediaType, reMediaType)
      )
      it('the parse result contains annotation element', ->
        assert.include(JSON.stringify(apiElements), '"annotation"')
      )
      it('the annotation is a warning', ->
        assert.include(JSON.stringify(apiElements), '"warning"')
      )
    )
  )

  describe('Unexpected parser behavior causes \'unexpected parser error\'', ->
    error = undefined
    mediaType = undefined
    apiElements = undefined

    beforeEach((done) ->
      sinon.stub(fury, 'parse', (args...) ->
        args.pop()() # calling the callback with neither error or parse result
      )
      parse('... dummy API description document ...', (args...) ->
        [error, {mediaType, apiElements}] = args
        done()
      )
    )
    afterEach( ->
      fury.parse.restore()
    )

    it('produces error', ->
      assert.instanceOf(error, Error)
    )
    it('the error is the \'unexpected parser error\' error', ->
      assert.include(error.message.toLowerCase(), 'unexpected parser error')
    )
    it('produces no parse result', ->
      assert.isNull(apiElements)
    )
  )

  describe('Completely unknown document format is treated as API Blueprint', ->
    error = undefined
    mediaType = undefined
    apiElements = undefined

    beforeEach((done) ->
      parse('... dummy API description document ...', (args...) ->
        [error, {mediaType, apiElements}] = args
        done()
      )
    )

    it('produces no error', ->
      assert.isNull(error)
    )
    it('produces API Elements', ->
      assert.isObject(apiElements)
    )
    it('produces media type', ->
      assert.match(mediaType, reMediaType)
    )
    it('the parse result contains annotation element', ->
      assert.include(JSON.stringify(apiElements), '"annotation"')
    )
    it('the annotation is a warning', ->
      assert.include(JSON.stringify(apiElements), '"warning"')
    )
    it('the warning is about falling back to API Blueprint', ->
      assert.include(JSON.stringify(apiElements), 'to API Blueprint')
    )
  )

  describe('Unrecognizable API Blueprint is treated as API Blueprint', ->
    error = undefined
    mediaType = undefined
    apiElements = undefined

    beforeEach((done) ->
      parse(fixtures.unrecognizable.apiBlueprint, (args...) ->
        [error, {mediaType, apiElements}] = args
        done()
      )
    )

    it('produces no error', ->
      assert.isNull(error)
    )
    it('produces API Elements', ->
      assert.isObject(apiElements)
    )
    it('produces media type', ->
      assert.match(mediaType, reMediaType)
    )
    it('the parse result contains annotation element', ->
      assert.include(JSON.stringify(apiElements), '"annotation"')
    )
    it('the annotation is a warning', ->
      assert.include(JSON.stringify(apiElements), '"warning"')
    )
    it('the warning is about falling back to API Blueprint', ->
      assert.include(JSON.stringify(apiElements), 'to API Blueprint')
    )
  )
)
