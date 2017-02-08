{assert} = require('chai')

Dredd = require('../../../src/dredd')
{runDreddWithServer, createServer} = require('../helpers')


describe('Regression: Issue #152', ->
  describe('Modify transaction object inside beforeAll combined with beforeEach helper', ->
    runtimeInfo = undefined

    beforeEach((done) ->
      app = createServer()
      app.get('/machines', (req, res) ->
        res.json([{type: 'bulldozer', name: 'willy'}])
      )

      dredd = new Dredd({
        options: {
          path: './test/fixtures/single-get.apib'
          hookfiles: './test/fixtures/regression-152.coffee'
        }
      })

      runDreddWithServer(dredd, app, (args...) ->
        [err, runtimeInfo] = args
        done(err)
      )
    )

    it('should modify the transaction with hooks', ->
      assert.deepEqual(Object.keys(runtimeInfo.server.requests), ['/machines?api-key=23456'])
    )
  )
)
