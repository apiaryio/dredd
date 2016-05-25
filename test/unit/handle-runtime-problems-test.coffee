
{assert} = require('chai')
sinon = require('sinon')
proxyquire = require('proxyquire')
dreddTransactions = require('dredd-transactions')

logger = require('../../src/logger')
handleRuntimeProblems = proxyquire('../../src/handle-runtime-problems',
  './logger': logger
)


prepareData = (apiDescriptionDocument, filename, done) ->
  dreddTransactions.compile(apiDescriptionDocument, filename, (err, {errors, warnings}) ->
    return done(err) if err

    annotations = []
    for error in errors
      error.type = 'error'
      annotations.push(error)
    for warning in warnings
      warning.type = 'warning'
      annotations.push(warning)

    data = {}
    data[filename] = {raw: apiDescriptionDocument, filename, annotations}

    done(null, data)
  )


describe('handleRuntimeProblems()', ->
  warnOutput = undefined
  errorOutput = undefined

  beforeEach( ->
    warnOutput = ''
    errorOutput = ''

    sinon.stub(logger, 'warn', (args...) ->
      warnOutput += args.join(' ').toLowerCase()
    )
    sinon.stub(logger, 'error', (args...) ->
      errorOutput += args.join(' ').toLowerCase()
    )
  )
  afterEach( ->
    logger.warn.restore()
    logger.error.restore()
  )

  describe('Prints parser error', ->
    error = undefined

    apiDescriptionDocument = '''
      FORMAT: 1A
      # Beehive API
      \t\t
    '''
    filename = 'dummy-filename.apib'

    beforeEach((done) ->
      prepareData(apiDescriptionDocument, filename, (err, data) ->
        return done(err) if err
        error = handleRuntimeProblems(data)
        done()
      )
    )

    it('returns error', ->
      assert.ok(error)
    )
    it('has no warning output', ->
      assert.equal(warnOutput, '')
    )
    it('has error output', ->
      assert.ok(errorOutput)
    )
    context('the error output', ->
      it('mentions it is from parser', ->
        assert.include(errorOutput, 'parser')
      )
      it('mentions it is error', ->
        assert.include(errorOutput, 'error')
      )
      it('mentions the filename', ->
        assert.include(errorOutput, filename)
      )
      it('mentions the line', ->
        assert.include(errorOutput, 'on line 3')
      )
      it('does not contain any NaNs', ->
        assert.notInclude(errorOutput, 'nan')
      )
    )
  )

  describe('Prints parser warning', ->
    error = undefined

    apiDescriptionDocument = '''
      FORMAT: 1A
      # Beehive API
      ## Honey [/honey]
      ### Remove [DELETE]
      + Response
    '''
    filename = 'dummy-filename.apib'

    beforeEach((done) ->
      prepareData(apiDescriptionDocument, filename, (err, data) ->
        return done(err) if err
        error = handleRuntimeProblems(data)
        done()
      )
    )

    it('returns no error', ->
      assert.notOk(error)
    )
    it('has no error output', ->
      assert.equal(errorOutput, '')
    )
    it('has warning output', ->
      assert.ok(warnOutput)
    )
    context('the warning output', ->
      it('mentions it is from parser', ->
        assert.include(warnOutput, 'parser')
      )
      it('mentions it is warning', ->
        assert.include(warnOutput, 'warn')
      )
      it('mentions the filename', ->
        assert.include(warnOutput, filename)
      )
      it('mentions the line', ->
        assert.include(warnOutput, 'on line 5')
      )
      it('does not contain any NaNs', ->
        assert.notInclude(warnOutput, 'nan')
      )
    )
  )

  describe('Prints warning about missing title', ->
    error = undefined

    apiDescriptionDocument = '''
      FORMAT: 1A
      So Long, and Thanks for All the Fish!
    '''
    filename = 'dummy-filename.apib'

    beforeEach((done) ->
      prepareData(apiDescriptionDocument, filename, (err, data) ->
        return done(err) if err
        error = handleRuntimeProblems(data)
        done()
      )
    )

    it('returns no error', ->
      assert.notOk(error)
    )
    it('has no error output', ->
      assert.equal(errorOutput, '')
    )
    it('has warning output', ->
      assert.ok(warnOutput)
    )
    context('the warning output', ->
      it('mentions it is from parser', ->
        assert.include(warnOutput, 'parser')
      )
      it('mentions it is warning', ->
        assert.include(warnOutput, 'warning')
      )
      it('mentions the filename', ->
        assert.include(warnOutput, filename)
      )
      it('mentions the line', ->
        assert.include(warnOutput, 'on line 1')
      )
      it('does not contain any NaNs', ->
        assert.notInclude(warnOutput, 'nan')
      )
    )
  )
)
