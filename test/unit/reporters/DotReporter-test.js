import { noCallThru } from 'proxyquire'
import sinon from 'sinon'

import { assert } from 'chai'
import { EventEmitter } from 'events'

import loggerStub from '../../../lib/logger'
import reporterOutputLoggerStub from '../../../lib/reporters/reporterOutputLogger'

const proxyquire = noCallThru()
const DotReporter = proxyquire('../../../lib/reporters/DotReporter', {
  '../logger': loggerStub
}).default

describe('DotReporter', () => {
  let stats = {}
  let test = []
  let emitter
  let dotReporter

  before(() => {
    loggerStub.transports.console.silent = true
  })

  after(() => {
    loggerStub.transports.console.silent = false
  })

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
    dotReporter = new DotReporter(emitter, stats)
  })

  describe('when starting', () => {
    beforeEach(() => sinon.spy(loggerStub, 'debug'))

    afterEach(() => loggerStub.debug.restore())

    it('should log that testing has begun', () =>
      emitter.emit('start', '', () => assert.isOk(loggerStub.debug.called)))
  })

  describe('when ending', () => {
    beforeEach(() => {
      stats.tests = 1
      sinon.spy(reporterOutputLoggerStub, 'complete')
      sinon.stub(dotReporter, 'write')
    })

    afterEach(() => {
      reporterOutputLoggerStub.complete.restore()
      dotReporter.write.restore()
    })

    it('should log that testing is complete', () =>
      emitter.emit('end', () =>
        assert.isOk(reporterOutputLoggerStub.complete.calledTwice)
      ))

    describe('when there are failures', () => {
      before(() => {
        test = {
          status: 'fail',
          title: 'failing test'
        }
      })

      beforeEach(() => {
        dotReporter.errors = [test]
        dotReporter.stats.tests = 1
        emitter.emit('test start', test)
        sinon.spy(reporterOutputLoggerStub, 'fail')
      })

      afterEach(() => reporterOutputLoggerStub.fail.restore())

      it('should log the failures at the end of testing', (done) =>
        emitter.emit('end', () => {
          assert.isOk(reporterOutputLoggerStub.fail.called)
          done()
        }))
    })
  })

  describe('when test passes', () => {
    before(() => {
      test = {
        status: 'pass',
        title: 'Passing Test'
      }
    })

    beforeEach(() => {
      sinon.stub(dotReporter, 'write')
      emitter.emit('test start', test)
      emitter.emit('test pass', test)
    })

    after(() => dotReporter.write.restore())

    it('should write a .', () => assert.isOk(dotReporter.write.calledWith('.')))
  })

  describe('when test is skipped', () => {
    before(() => {
      test = {
        status: 'skipped',
        title: 'Skipped Test'
      }
    })

    beforeEach(() => {
      sinon.stub(dotReporter, 'write')
      emitter.emit('test start', test)
      emitter.emit('test skip', test)
    })

    after(() => dotReporter.write.restore())

    it('should write a -', () => assert.isOk(dotReporter.write.calledWith('-')))
  })

  describe('when test fails', () => {
    before(() => {
      test = {
        status: 'failed',
        title: 'Failed Test'
      }
    })

    beforeEach(() => {
      sinon.stub(dotReporter, 'write')
      emitter.emit('test start', test)
      emitter.emit('test fail', test)
    })

    after(() => dotReporter.write.restore())

    it('should write an F', () =>
      assert.isOk(dotReporter.write.calledWith('F')))
  })

  describe('when test errors', () => {
    before(() => {
      test = {
        status: 'error',
        title: 'Errored Test'
      }
    })

    beforeEach(() => {
      sinon.stub(dotReporter, 'write')
      emitter.emit('test start', test)
      emitter.emit('test error', new Error('Error'), test)
    })

    after(() => dotReporter.write.restore())

    it('should write an E', () =>
      assert.isOk(dotReporter.write.calledWith('E')))
  })
})
