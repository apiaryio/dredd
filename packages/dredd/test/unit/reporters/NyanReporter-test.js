import { noCallThru } from 'proxyquire'
import sinon from 'sinon'

import { assert } from 'chai'
import { EventEmitter } from 'events'

import reporterOutputLoggerStub from '../../../lib/reporters/reporterOutputLogger'

const proxyquire = noCallThru()
const NyanCatReporter = proxyquire('../../../lib/reporters/NyanReporter', {
  './reporterOutputLogger': reporterOutputLoggerStub
}).default

describe('NyanCatReporter', () => {
  let emitter
  let stats
  let nyanReporter

  before(() => {
    reporterOutputLoggerStub.transports.console.silent = true
  })

  after(() => {
    reporterOutputLoggerStub.transports.console.silent = false
  })

  beforeEach(() => {
    emitter = new EventEmitter()
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
    nyanReporter = new NyanCatReporter(emitter, stats)
  })

  describe('when starting', () => {
    beforeEach(() => {
      sinon.spy(nyanReporter, 'cursorHide')
      sinon.spy(nyanReporter, 'draw')
      sinon.stub(nyanReporter, 'write')
    })

    afterEach(() => {
      nyanReporter.cursorHide.restore()
      nyanReporter.draw.restore()
      nyanReporter.write.restore()
    })

    it('should hide the cursor and draw the cat', (done) =>
      emitter.emit('start', '', () => {
        assert.isOk(nyanReporter.cursorHide.calledOnce)
        assert.isOk(nyanReporter.draw.calledOnce)
        done()
      }))
  })

  describe('when ending', () => {
    beforeEach(() => {
      sinon.spy(reporterOutputLoggerStub, 'complete')
      sinon.spy(nyanReporter, 'draw')
      sinon.stub(nyanReporter, 'write')
    })

    afterEach(() => {
      reporterOutputLoggerStub.complete.restore()
      nyanReporter.draw.restore()
      nyanReporter.write.restore()
    })

    it('should log that testing is complete', (done) =>
      emitter.emit('end', () => {
        assert.isOk(reporterOutputLoggerStub.complete.calledTwice)
        done()
      }))

    describe('when there are failures', () => {
      beforeEach(() => {
        const test = {
          status: 'fail',
          title: 'failing test'
        }
        nyanReporter.errors = [test]
        emitter.emit('test start', test)
        sinon.spy(reporterOutputLoggerStub, 'fail')
      })

      afterEach(() => reporterOutputLoggerStub.fail.restore())

      it('should log the failures at the end of testing', (done) =>
        emitter.emit('end', () => {
          assert.isOk(reporterOutputLoggerStub.fail.calledTwice)
          done()
        }))
    })
  })

  describe('when test finished', () => {
    describe('when test passes', () => {
      beforeEach(() => {
        const test = {
          status: 'pass',
          title: 'Passing Test'
        }
        sinon.stub(nyanReporter, 'write')
        sinon.spy(nyanReporter, 'draw')
        emitter.emit('test pass', test)
      })

      afterEach(() => {
        nyanReporter.draw.restore()
        nyanReporter.write.restore()
      })

      it('should draw the cat', () => assert.isOk(nyanReporter.draw.calledOnce))
    })

    describe('when test is skipped', () => {
      beforeEach(() => {
        const test = {
          status: 'skipped',
          title: 'Skipped Test'
        }
        sinon.spy(nyanReporter, 'draw')
        sinon.stub(nyanReporter, 'write')
        emitter.emit('test skip', test)
      })

      afterEach(() => {
        nyanReporter.draw.restore()
        nyanReporter.write.restore()
      })

      it('should draw the cat', () => assert.isOk(nyanReporter.draw.calledOnce))
    })

    describe('when test fails', () => {
      beforeEach(() => {
        const test = {
          status: 'failed',
          title: 'Failed Test'
        }
        sinon.spy(nyanReporter, 'draw')
        sinon.stub(nyanReporter, 'write')
        emitter.emit('test fail', test)
      })

      afterEach(() => {
        nyanReporter.draw.restore()
        nyanReporter.write.restore()
      })

      it('should draw the cat', () => assert.isOk(nyanReporter.draw.calledOnce))
    })

    describe('when test errors', () => {
      beforeEach(() => {
        const test = {
          status: 'error',
          title: 'Errored Test'
        }
        sinon.spy(nyanReporter, 'draw')
        sinon.stub(nyanReporter, 'write')
        emitter.emit('test error', new Error('Error'), test)
      })

      afterEach(() => {
        nyanReporter.write.restore()
        nyanReporter.draw.restore()
      })

      it('should draw the cat', () => assert.isOk(nyanReporter.draw.calledOnce))
    })
  })
})
