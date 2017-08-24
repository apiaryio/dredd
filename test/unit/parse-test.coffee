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
        parse(source, (err, parseResult) ->
          error = err
          {mediaType, apiElements} = parseResult if parseResult
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
      it('the parse result is API Elements represented by minim objects', ->
        assert.instanceOf(apiElements, fury.minim.elements.ParseResult)
      )
      it('the parse result contains no annotation elements', ->
        assert.isTrue(apiElements.annotations?.isEmpty)
      )
      it('the parse result contains source map elements', ->
        sourceMaps = apiElements
          .recursiveChildren
          .map((element) -> element.sourceMapValue)
          .filter((sourceMap) -> !!sourceMap)
        assert.ok(sourceMaps.length)
      )
    )
  )

  describe('Invalid document causes error', ->
    fixtures.parserError.forEachDescribe(({source}) ->
      error = undefined
      mediaType = undefined
      apiElements = undefined

      beforeEach((done) ->
        parse(source, (err, parseResult) ->
          error = err
          {mediaType, apiElements} = parseResult if parseResult
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
      it('the parse result contains annotation elements', ->
        assert.isFalse(apiElements.annotations?.isEmpty)
      )
      it('the annotations are errors', ->
        assert.equal(apiElements.errors?.length, apiElements.annotations.length)
      )
    )
  )

  describe('Defective document causes warning', ->
    fixtures.parserWarning.forEachDescribe(({source}) ->
      error = undefined
      mediaType = undefined
      apiElements = undefined

      beforeEach((done) ->
        parse(source, (err, parseResult) ->
          error = err
          {mediaType, apiElements} = parseResult if parseResult
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
      it('the parse result contains annotation elements', ->
        assert.isFalse(apiElements.annotations?.isEmpty)
      )
      it('the annotations are warnings', ->
        assert.equal(apiElements.warnings?.length, apiElements.annotations.length)
      )
    )
  )

  describe('Unexpected parser behavior causes \'unexpected parser error\'', ->
    error = undefined
    mediaType = undefined
    apiElements = undefined

    beforeEach((done) ->
      sinon.stub(fury, 'parse').callsFake((args...) ->
        args.pop()() # calling the callback with neither error or parse result
      )
      parse('... dummy API description document ...', (err, parseResult) ->
        error = err
        {mediaType, apiElements} = parseResult if parseResult
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
      parse('... dummy API description document ...', (err, parseResult) ->
        error = err
        {mediaType, apiElements} = parseResult if parseResult
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
    it('the parse result contains annotation elements', ->
      assert.isFalse(apiElements.annotations?.isEmpty)
    )
    it('the annotations are warnings', ->
      assert.equal(apiElements.warnings?.length, apiElements.annotations.length)
    )
    it('the first warning is about falling back to API Blueprint', ->
      assert.include(apiElements.warnings.getValue(0), 'to API Blueprint')
    )
  )

  describe('Unrecognizable API Blueprint is treated as API Blueprint', ->
    error = undefined
    mediaType = undefined
    apiElements = undefined

    beforeEach((done) ->
      parse(fixtures.unrecognizable.apiBlueprint, (err, parseResult) ->
        error = err
        {mediaType, apiElements} = parseResult if parseResult
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
    it('the parse result contains annotation elements', ->
      assert.isFalse(apiElements.annotations?.isEmpty)
    )
    it('the annotations are warnings', ->
      assert.equal(apiElements.warnings?.length, apiElements.annotations.length)
    )
    it('the first warning is about falling back to API Blueprint', ->
      assert.include(apiElements.warnings.getValue(0), 'to API Blueprint')
    )
  )
)


describe('minim element extensions', ->
  describe('closest()', ->
    describe('when there is no parent property', ->
      arrayElement = fury.minim.toElement([1, 2, 3])
      itemElement = arrayElement.get(0)

      it('returns the element itself if the element names match', ->
        assert.equal(itemElement.closest('number'), itemElement)
      )
      it('returns null if the element itself does not match', ->
        assert.isNull(itemElement.closest('array'))
      )
    )
    describe('when elements are made immutable by freeze()', ->
      objectElement = fury.minim.toElement({'numbers': [1, 2, 3]})
      objectElement.classes.push('foo')
      arrayElement = objectElement.get('numbers')
      arrayElement.classes.push('foo')
      itemElement = arrayElement.get(0)
      itemElement.classes.push('foo')
      objectElement.freeze()

      it('returns the element itself if the element names match', ->
        assert.equal(itemElement.closest('number'), itemElement)
      )
      it('returns direct parent element if the element names match', ->
        assert.equal(itemElement.closest('array'), arrayElement)
      )
      it('returns distant ancestor element if the element names match', ->
        assert.equal(itemElement.closest('object'), objectElement)
      )
      it('returns nothing if the element names match, but not the class names', ->
        assert.isNull(itemElement.closest('number', 'bar'))
        assert.isNull(itemElement.closest('array', 'bar'))
        assert.isNull(itemElement.closest('object', 'bar'))
      )
      it('returns the element itself if both the element and class names match', ->
        assert.equal(itemElement.closest('number', 'foo'), itemElement)
      )
      it('returns direct parent element if both the element and class names match', ->
        assert.equal(itemElement.closest('array', 'foo'), arrayElement)
      )
      it('returns distant ancestor element if both the element and class names match', ->
        assert.equal(itemElement.closest('object', 'foo'), objectElement)
      )
    )
  )
)
