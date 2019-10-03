import { noCallThru } from 'proxyquire'
import { assert } from 'chai'
import { EventEmitter } from 'events'

import loggerStub from '../../../lib/logger'

const proxyquire = noCallThru()
const BaseReporter = proxyquire('../../../lib/reporters/BaseReporter', {
  '../logger': loggerStub
}).default

describe('BaseReporter', () => {
  let stats = {}
  let test = {}
  let emitter = {}

  beforeEach(() => {
    stats = {
      tests: 0,
      failures: 0,
      errors: 0,
      passes: 0,
      skipped: 0,
      start: 0,
      end: 0,
      duration: 0
    }
    emitter = new EventEmitter()
    new BaseReporter(emitter, stats)
  })

  describe('when starting', () => {
    before(() => {
      stats = { start: null }
    })

    it('should set the start date', (done) =>
      emitter.emit('start', '', () => {
        assert.isOk(stats.start)
        done()
      }))
  })

  describe('when ending', () => {
    before(() => {
      stats = { start: null }
    })

    it('should set the end date', (done) =>
      emitter.emit('end', () => {
        assert.isOk(stats.end)
        done()
      }))
  })

  describe('when test starts', () => {
    beforeEach(() => {
      test = {
        status: 'pass',
        title: 'Passing Test'
      }
      emitter.emit('test start', test)
    })

    it('should increment the counter', () => assert.equal(stats.tests, 1))

    it('should set the start time', () => assert.isOk(test.start))
  })

  describe('when test passes', () => {
    beforeEach(() => {
      test = {
        status: 'pass',
        title: 'Passing Test'
      }
      emitter.emit('test start', test)
      emitter.emit('test pass', test)
    })

    it('should increment the counter', () => assert.equal(stats.passes, 1))

    it('should set the end time', () => assert.isOk(test.end))
  })

  describe('when test is skipped', () => {
    beforeEach(() => {
      test = {
        status: 'skipped',
        title: 'Skipped Test'
      }
      emitter.emit('test start', test)
      emitter.emit('test skip', test)
    })

    it('should increment the counter', () => assert.isOk(stats.skipped === 1))
  })

  describe('when test fails', () => {
    beforeEach(() => {
      test = {
        status: 'failed',
        title: 'Failed Test'
      }
      emitter.emit('test start', test)
      emitter.emit('test fail', test)
    })

    it('should increment the counter', () => assert.isOk(stats.failures === 1))

    it('should set the end time', () => assert.isOk(test.end))
  })

  describe('when test errors', () => {
    beforeEach(() => {
      test = {
        status: 'error',
        title: 'Errored Test'
      }
      emitter.emit('test start', test)
      emitter.emit('test error', new Error('Error'), test)
    })

    it('should increment the counter', () => assert.isOk(stats.errors === 1))

    it('should set the end time', () => assert.isOk(test.end))
  })

  describe('when passing test start is UTC string', () => {
    beforeEach(() => {
      test = {
        status: 'pass',
        title: 'Passing Test'
      }
      emitter.emit('test start', test)
      test.start = '2017-06-15T09:29:50.588Z'
      emitter.emit('test pass', test)
    })

    it('should set the duration', () => assert.isNotNaN(test.duration))
  })

  describe('when failed test start is UTC string', () => {
    beforeEach(() => {
      test = {
        status: 'pass',
        title: 'Failed Test'
      }
      emitter.emit('test start', test)
      test.start = '2017-06-15T09:29:50.588Z'
      emitter.emit('test fail', test)
    })

    it('should set the duration', () => assert.isNotNaN(test.duration))
  })

  describe('when errored test start is UTC string', () => {
    beforeEach(() => {
      test = {
        status: 'pass',
        title: 'Errored Test'
      }
      emitter.emit('test start', test)
      test.start = '2017-06-15T09:29:50.588Z'
      emitter.emit('test error', new Error('Error'), test)
    })

    it('should set the duration', () => assert.isNotNaN(test.duration))
  })
})
