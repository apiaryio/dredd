import { assert } from 'chai'

import Dredd from '../../../lib/Dredd'
import { runDreddWithServer, createServer } from '../helpers'

describe('Regression: Issue #615', () => {
  let runtimeInfo

  before((done) => {
    const app = createServer()
    app.all('/honey', (req, res) =>
      res
        .status(200)
        .type('text/plain')
        .send('')
    )

    const dredd = new Dredd({
      options: { path: './test/fixtures/regression-615.apib' }
    })
    runDreddWithServer(dredd, app, (...args) => {
      let err
      // eslint-disable-next-line
      ;[err, runtimeInfo] = Array.from(args)
      done(err)
    })
  })

  it('outputs no failures', () =>
    assert.equal(runtimeInfo.dredd.stats.failures, 0))
  it('results in exactly three tests', () =>
    assert.equal(runtimeInfo.dredd.stats.tests, 3))
  it('results in three passing tests', () => {
    // Ensures just the 200 responses were selected, because the server returns only 200s
    assert.equal(runtimeInfo.dredd.stats.passes, 3)
  })
})
