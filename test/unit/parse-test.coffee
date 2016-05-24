
fs = require('fs')
path = require('path')
sinon = require('sinon')
fury = require('fury')
{assert} = require('chai')

parse = require('../../src/parse')


describe('Parsing API description document', ->
  fixturesDir = path.join(__dirname, '..', 'fixtures')

  describe('Valid API Blueprint document gets correctly parsed', ->
    fixture = path.join(fixturesDir, 'parse.apib')
    apiDescriptionDocument = fs.readFileSync(fixture, 'utf-8')

    error = undefined
    parseResult = undefined

    beforeEach((done) ->
      parse(apiDescriptionDocument, (args...) ->
        [error, parseResult] = args
        done()
      )
    )

    it('produces no error', ->
      assert.isNull(error)
    )
    it('produces parse result', ->
      assert.isObject(parseResult)
    )
    it('the parse result is in the API Elements format', ->
      assert.equal(parseResult.element, 'parseResult')
      assert.isArray(parseResult.content)
    )
    it('the parse result contains no annotation elements', ->
      assert.notInclude(JSON.stringify(parseResult), '"annotation"')
    )
    it('the parse result contains source map elements', ->
      assert.include(JSON.stringify(parseResult), '"sourceMap"')
    )
  )

  describe('Invalid API Blueprint document causes error', ->
    fixture = path.join(fixturesDir, 'parse-error.apib')
    apiDescriptionDocument = fs.readFileSync(fixture, 'utf-8')

    error = undefined
    parseResult = undefined

    beforeEach((done) ->
      parse(apiDescriptionDocument, (args...) ->
        [error, parseResult] = args
        done()
      )
    )

    it('produces error', ->
      assert.instanceOf(error, Error)
    )
    it('produces parse result', ->
      assert.isObject(parseResult)
    )
    it('the parse result contains annotation element', ->
      assert.include(JSON.stringify(parseResult), '"annotation"')
    )
    it('the annotation is an error', ->
      assert.include(JSON.stringify(parseResult), '"error"')
    )
  )

  describe('Defective API Blueprint document causes warning', ->
    fixture = path.join(fixturesDir, 'parse-warning.apib')
    apiDescriptionDocument = fs.readFileSync(fixture, 'utf-8')

    error = undefined
    parseResult = undefined

    beforeEach((done) ->
      parse(apiDescriptionDocument, (args...) ->
        [error, parseResult] = args
        done()
      )
    )

    it('produces no error', ->
      assert.isNull(error)
    )
    it('produces parse result', ->
      assert.isObject(parseResult)
    )
    it('the parse result contains annotation element', ->
      assert.include(JSON.stringify(parseResult), '"annotation"')
    )
    it('the annotation is a warning', ->
      assert.include(JSON.stringify(parseResult), '"warning"')
    )
  )

  describe('Unexpected parser behavior causes \'unexpected parser error\'', ->
    error = undefined
    parseResult = undefined

    beforeEach((done) ->
      sinon.stub(fury, 'parse', (args...) ->
        args.pop()() # calling the callback with neither error or parse result
      )
      parse('... dummy API description document ...', (args...) ->
        [error, parseResult] = args
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
      assert.isNull(parseResult)
    )
  )
)
