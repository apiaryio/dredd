import { assert } from 'chai'

import Dredd from '../../../lib/Dredd'
import { runDreddWithServer, createServer } from '../helpers'

describe('Regression: Issue #893 and #897', () => {
  describe('when the response has no explicit status code', () => {
    let runtimeInfo

    before((done) => {
      const app = createServer()
      app.get('/resource', (req, res) =>
        res.json({ name: 'Honza', color: 'green' })
      )

      const dredd = new Dredd({
        options: { path: './test/fixtures/regression-893.yaml' }
      })
      runDreddWithServer(dredd, app, (...args) => {
        let err
        // eslint-disable-next-line
        ;[err, runtimeInfo] = Array.from(args)
        done(err)
      })
    })

    it('outputs no failures or errors', () =>
      assert.equal(
        runtimeInfo.dredd.stats.failures + runtimeInfo.dredd.stats.errors,
        0
      ))
    it('results in exactly one test', () =>
      assert.equal(runtimeInfo.dredd.stats.tests, 1))
    it('results in one passing test (HTTP 200 is assumed)', () =>
      assert.equal(runtimeInfo.dredd.stats.passes, 1))
  })

  describe('when the response has no explicit schema and it has empty body', () => {
    let runtimeInfo

    before((done) => {
      const app = createServer()
      app.get('/resource', (req, res) =>
        res.json({ name: 'Honza', color: 'green' })
      )
      app.get('/resource.csv', (req, res) =>
        res.type('text/csv').send('name,color\nHonza,green\n')
      )

      const dredd = new Dredd({
        options: { path: './test/fixtures/regression-897-body.yaml' }
      })
      runDreddWithServer(dredd, app, (...args) => {
        let err
        // eslint-disable-next-line
        ;[err, runtimeInfo] = Array.from(args)
        done(err)
      })
    })

    it('outputs no failures or errors', () =>
      assert.equal(
        runtimeInfo.dredd.stats.failures + runtimeInfo.dredd.stats.errors,
        0
      ))
    it('results in exactly two tests', () =>
      assert.equal(runtimeInfo.dredd.stats.tests, 2))
    it('results in two passing tests (body is not validated)', () =>
      assert.equal(runtimeInfo.dredd.stats.passes, 2))
  })

  describe('when the response has no explicit schema', () => {
    let runtimeInfo

    before((done) => {
      const app = createServer()
      app.get('/resource', (req, res) =>
        res.json({ name: 'Honza', color: 'green' })
      )
      app.get('/resource.csv', (req, res) =>
        res.type('text/csv').send('name,color\nHonza,green\n')
      )

      const dredd = new Dredd({
        options: { path: './test/fixtures/regression-897-schema.yaml' }
      })
      runDreddWithServer(dredd, app, (...args) => {
        let err
        // eslint-disable-next-line
        ;[err, runtimeInfo] = Array.from(args)
        done(err)
      })
    })

    it('outputs no failures or errors', () =>
      assert.equal(
        runtimeInfo.dredd.stats.failures + runtimeInfo.dredd.stats.errors,
        0
      ))
    it('results in exactly two tests', () =>
      assert.equal(runtimeInfo.dredd.stats.tests, 2))
    it('results in two passing tests', () =>
      assert.equal(runtimeInfo.dredd.stats.passes, 2))
  })
})
