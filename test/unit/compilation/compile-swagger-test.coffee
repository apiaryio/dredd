
fixtures = require('../../fixtures')
{assert, compileFixture} = require('../../utils')
createLocationSchema = require('../../schemas/location')


describe('compile() · Swagger', ->
  locationSchema = createLocationSchema()

  describe('causing a \'not specified in URI Template\' error', ->
    err = undefined
    errors = undefined
    transactions = undefined

    beforeEach((done) ->
      compileFixture(fixtures.notSpecifiedInUriTemplateAnnotation.swagger, (args...) ->
        [err, {errors, transactions}] = args
        done(err)
      )
    )

    it('is compiled into expected number of transactions', ->
      assert.equal(transactions.length, 0)
    )
    it('is compiled with a single error', ->
      assert.equal(errors.length, 1)
    )
    context('the error', ->
      it('comes from parser', ->
        assert.equal(errors[0].component, 'apiDescriptionParser')
      )
      it('has code', ->
        assert.isNumber(errors[0].code)
      )
      it('has message', ->
        assert.include(errors[0].message.toLowerCase(), 'no corresponding')
        assert.include(errors[0].message.toLowerCase(), 'in the path string')
      )
      it('has no location', ->
        assert.notOk(errors[0].location)
      )
      it('has no origin', ->
        assert.isUndefined(errors[0].origin)
      )
    )
  )
)
