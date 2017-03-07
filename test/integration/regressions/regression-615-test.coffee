{assert} = require('chai')

Dredd = require('../../../src/dredd')
{runDreddWithServer, createServer} = require('../helpers')


describe('Regression: Issue #615', ->
  runtimeInfo = undefined

  beforeEach((done) ->
    app = createServer()
    app.all('/honey', (req, res) ->
      res.status(200).type('text/plain').send('')
    )

    dredd = new Dredd({options: {path: './test/fixtures/regression-615.apib'}})
    runDreddWithServer(dredd, app, (args...) ->
      [err, runtimeInfo] = args
      done(err)
    )
  )

  it('outputs no failures', ->
    assert.equal(runtimeInfo.dredd.stats.failures, 0)
  )
  it('results in exactly three tests', ->
    assert.equal(runtimeInfo.dredd.stats.tests, 3)
  )
  it('results in three passing tests', ->
    # Ensures just the 200 responses were selected, because the server returns only 200s
    assert.equal(runtimeInfo.dredd.stats.passes, 3)
  )
)
