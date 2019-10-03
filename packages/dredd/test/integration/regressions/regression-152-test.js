import { assert } from 'chai'

import Dredd from '../../../lib/Dredd'
import { runDreddWithServer, createServer } from '../helpers'

describe('Regression: Issue #152', () =>
  describe('Modify transaction object inside beforeAll combined with beforeEach helper', () => {
    let runtimeInfo

    before((done) => {
      const app = createServer()
      app.get('/machines', (req, res) =>
        res.json([{ type: 'bulldozer', name: 'willy' }])
      )

      const dredd = new Dredd({
        options: {
          path: './test/fixtures/single-get.apib',
          require: 'coffeescript/register',
          hookfiles: './test/fixtures/regression-152.coffee'
        }
      })

      runDreddWithServer(dredd, app, (...args) => {
        let err
        // eslint-disable-next-line
        ;[err, runtimeInfo] = Array.from(args)
        done(err)
      })
    })

    it('should modify the transaction with hooks', () =>
      assert.deepEqual(Object.keys(runtimeInfo.server.requests), [
        '/machines?api-key=23456'
      ]))
  }))
