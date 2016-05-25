
{assert} = require('chai')

dreddTransactions = require('../../src/dredd-transactions')


describe('Dredd Transactions', ->
  describe('When given no input', ->
    compilationResult = undefined

    beforeEach((done) ->
      dreddTransactions.compile('', null, (args...) ->
        [err, compilationResult] = args
        done(err)
      )
    )

    it('produces one error', ->
      assert.equal(compilationResult.errors.length, 1)
    )
    it('produces no warnings', ->
      assert.equal(compilationResult.warnings.length, 0)
    )
    it('produces no transactions', ->
      assert.equal(compilationResult.transactions.length, 0)
    )
  )

  describe('When given unknown API description format', ->
    compilationResult = undefined

    apiDescription = '''
      ... unknown API description format ...
    '''

    beforeEach((done) ->
      dreddTransactions.compile(apiDescription, null, (args...) ->
        [err, compilationResult] = args
        done(err)
      )
    )

    it('produces one error', ->
      assert.equal(compilationResult.errors.length, 1)
    )
    it('produces no warnings', ->
      assert.equal(compilationResult.warnings.length, 0)
    )
    it('produces no transactions', ->
      assert.equal(compilationResult.transactions.length, 0)
    )
  )

  describe('When given erroneous API Blueprint', ->
    compilationResult = undefined

    apiDescription = '''
      FORMAT: 1A
      # Beehive API
      \t\t
    '''

    beforeEach((done) ->
      dreddTransactions.compile(apiDescription, null, (args...) ->
        [err, compilationResult] = args
        done(err)
      )
    )

    it('produces one error', ->
      assert.equal(compilationResult.errors.length, 1)
    )
    it('produces no warnings', ->
      assert.equal(compilationResult.warnings.length, 0)
    )
    it('produces no transactions', ->
      assert.equal(compilationResult.transactions.length, 0)
    )
  )

  describe('When given API Blueprint with warning', ->
    compilationResult = undefined

    apiDescription = '''
      FORMAT: 1A
      # Beehive API
      ## Honey [/honey]
      ### Remove [DELETE]
      + Response
    '''

    beforeEach((done) ->
      dreddTransactions.compile(apiDescription, null, (args...) ->
        [err, compilationResult] = args
        done(err)
      )
    )

    it('produces no errors', ->
      assert.equal(compilationResult.errors.length, 0)
    )
    it('produces one warning', ->
      assert.equal(compilationResult.warnings.length, 1)
    )
    it('produces expected number of transactions', ->
      assert.equal(compilationResult.transactions.length, 1)
    )
  )

  describe('When given valid API Blueprint', ->
    compilationResult = undefined

    apiDescription = '''
      FORMAT: 1A
      # Beehive API
      ## Honey [/honey]
      ### Remove [DELETE]
      + Response 203
    '''

    beforeEach((done) ->
      dreddTransactions.compile(apiDescription, null, (args...) ->
        [err, compilationResult] = args
        done(err)
      )
    )

    it('produces no errors', ->
      assert.equal(compilationResult.errors.length, 0)
    )
    it('produces no warnings', ->
      assert.equal(compilationResult.warnings.length, 0)
    )
    it('produces expected number of transactions', ->
      assert.equal(compilationResult.transactions.length, 1)
    )
  )
)
