{assert} = require('chai')

Dredd = require('../../../src/dredd')
{runDreddWithServer, createServer} = require('../helpers')


describe('Regression: Issue #893 and #897', ->
  describe('when the response has no explicit status code', ->
    runtimeInfo = undefined

    before((done) ->
      app = createServer()
      app.get('/resource', (req, res) ->
        res.json({name: 'Honza', color: 'green'})
      )

      dredd = new Dredd({options: {path: './test/fixtures/regression-893.yaml'}})
      runDreddWithServer(dredd, app, (args...) ->
        [err, runtimeInfo] = args
        done(err)
      )
    )

    it('outputs no failures or errors', ->
      assert.equal(runtimeInfo.dredd.stats.failures + runtimeInfo.dredd.stats.errors, 0)
    )
    it('results in exactly one test', ->
      assert.equal(runtimeInfo.dredd.stats.tests, 1)
    )
    it('results in one passing test (HTTP 200 is assumed)', ->
      assert.equal(runtimeInfo.dredd.stats.passes, 1)
    )
  )

  describe('when the response has no explicit schema and it has empty body', ->
    runtimeInfo = undefined

    before((done) ->
      app = createServer()
      app.get('/resource', (req, res) ->
        res.json({name: 'Honza', color: 'green'})
      )
      app.get('/resource.csv', (req, res) ->
        res.type('text/csv').send('name,color\nHonza,green\n')
      )

      dredd = new Dredd({options: {path: './test/fixtures/regression-897-body.yaml'}})
      runDreddWithServer(dredd, app, (args...) ->
        [err, runtimeInfo] = args
        done(err)
      )
    )

    it('outputs no failures or errors', ->
      assert.equal(runtimeInfo.dredd.stats.failures + runtimeInfo.dredd.stats.errors, 0)
    )
    it('results in exactly two tests', ->
      assert.equal(runtimeInfo.dredd.stats.tests, 2)
    )
    it('results in two passing tests (body is not validated)', ->
      assert.equal(runtimeInfo.dredd.stats.passes, 2)
    )
  )

  describe('when the response has no explicit schema', ->
    runtimeInfo = undefined

    before((done) ->
      app = createServer()
      app.get('/resource', (req, res) ->
        res.json({name: 'Honza', color: 'green'})
      )
      app.get('/resource.csv', (req, res) ->
        res.type('text/csv').send('name,color\nHonza,green\n')
      )

      dredd = new Dredd({options: {path: './test/fixtures/regression-897-schema.yaml'}})
      runDreddWithServer(dredd, app, (args...) ->
        [err, runtimeInfo] = args
        done(err)
      )
    )

    it('outputs no failures or errors', ->
      assert.equal(runtimeInfo.dredd.stats.failures + runtimeInfo.dredd.stats.errors, 0)
    )
    it('results in exactly two tests', ->
      assert.equal(runtimeInfo.dredd.stats.tests, 2)
    )
    it('results in two passing tests', ->
      assert.equal(runtimeInfo.dredd.stats.passes, 2)
    )
  )
)
