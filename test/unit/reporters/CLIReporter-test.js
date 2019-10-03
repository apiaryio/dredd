import { noCallThru } from 'proxyquire'
import sinon from 'sinon'
import { assert } from 'chai'
import { EventEmitter } from 'events'

import loggerStub from '../../../lib/logger'
import reporterOutputLoggerStub from '../../../lib/reporters/reporterOutputLogger'

const proxyquire = noCallThru()
const CLIReporter = proxyquire('../../../lib/reporters/CLIReporter', {
  '../logger': loggerStub,
  './reporterOutputLogger': reporterOutputLoggerStub
}).default

describe('CLIReporter', () => {
  let test = {}

  before(() => {
    loggerStub.transports.console.silent = true
    reporterOutputLoggerStub.transports.console.silent = true
  })

  after(() => {
    loggerStub.transports.console.silent = false
    reporterOutputLoggerStub.transports.console.silent = false
  })

  describe('when starting', () => {
    beforeEach(() => sinon.spy(loggerStub, 'debug'))

    afterEach(() => loggerStub.debug.restore())

    it('should write starting to the console', (done) => {
      const emitter = new EventEmitter()
      new CLIReporter(emitter, {}, true)
      loggerStub.debug.resetHistory()
      emitter.emit('start', '', () => {
        assert.isOk(loggerStub.debug.calledOnce)
        done()
      })
    })
  })

  describe('when adding passing test', () => {
    before(() => {
      test = {
        status: 'pass',
        title: 'Passing Test'
      }
    })

    beforeEach(() => sinon.spy(reporterOutputLoggerStub, 'pass'))

    afterEach(() => reporterOutputLoggerStub.pass.restore())

    it('should write pass to the console', () => {
      const emitter = new EventEmitter()
      new CLIReporter(emitter, {}, true)
      emitter.emit('test pass', test)
      assert.isOk(reporterOutputLoggerStub.pass.calledOnce)
    })

    describe('when details=true', () => {
      beforeEach(() => sinon.spy(reporterOutputLoggerStub, 'request'))

      afterEach(() => reporterOutputLoggerStub.request.restore())

      it('should write details for passing tests', () => {
        const emitter = new EventEmitter()
        new CLIReporter(emitter, {}, true, true)
        emitter.emit('test pass', test)
        assert.isOk(reporterOutputLoggerStub.request.calledOnce)
      })
    })
  })

  describe('when adding failing test', () => {
    before(() => {
      test = {
        status: 'fail',
        title: 'Failing Test'
      }
    })

    describe('when errors are inline', () => {
      beforeEach(() => sinon.spy(reporterOutputLoggerStub, 'fail'))

      afterEach(() => reporterOutputLoggerStub.fail.restore())

      it('should write fail to the console', () => {
        const emitter = new EventEmitter()
        new CLIReporter(emitter, {}, true)
        emitter.emit('test fail', test)
        assert.isOk(reporterOutputLoggerStub.fail.calledTwice)
      })
    })

    describe('when errors are aggregated', () => {
      beforeEach(() => sinon.spy(reporterOutputLoggerStub, 'fail'))

      afterEach(() => reporterOutputLoggerStub.fail.restore())

      it('should not write full failure to the console at the time of failure', () => {
        const emitter = new EventEmitter()
        new CLIReporter(emitter, {}, false)
        emitter.emit('test fail', test)
        assert.isOk(reporterOutputLoggerStub.fail.calledOnce)
      })

      it('should write full failure to the console after execution is complete', (done) => {
        const emitter = new EventEmitter()
        const cliReporter = new CLIReporter(emitter, {}, false)
        cliReporter.errors = [test]
        emitter.emit('end', () => {
          assert.isOk(reporterOutputLoggerStub.fail.calledTwice)
          done()
        })
      })
    })
  })

  describe('when adding error test', () => {
    before(() => {
      test = {
        status: 'error',
        title: 'Error Test'
      }
    })

    beforeEach(() => sinon.spy(reporterOutputLoggerStub, 'error'))

    afterEach(() => reporterOutputLoggerStub.error.restore())

    it('should write error to the console', () => {
      const emitter = new EventEmitter()
      new CLIReporter(emitter, {}, false)
      emitter.emit('test error', new Error('Error'), test)
      assert.isOk(reporterOutputLoggerStub.error.calledTwice)
    })
  })

  describe('when adding error test with connection refused', () => {
    before(() => {
      test = {
        status: 'error',
        title: 'Error Test'
      }
    })

    beforeEach(() => sinon.spy(reporterOutputLoggerStub, 'error'))

    afterEach(() => reporterOutputLoggerStub.error.restore())

    const connectionErrors = [
      'ECONNRESET',
      'ENOTFOUND',
      'ESOCKETTIMEDOUT',
      'ETIMEDOUT',
      'ECONNREFUSED',
      'EHOSTUNREACH',
      'EPIPE'
    ]

    Array.from(connectionErrors).forEach((errType) =>
      describe(`when error type ${errType}`, () =>
        it('should write error to the console', () => {
          const emitter = new EventEmitter()
          new CLIReporter(emitter, {}, false)
          const error = new Error('connect')
          error.code = errType
          emitter.emit('test error', error, test)

          const messages = Object.keys(reporterOutputLoggerStub.error.args).map(
            (value, index) => reporterOutputLoggerStub.error.args[index][0]
          )

          assert.include(messages.join(), 'Error connecting')
        }))
    )
  })

  describe('when adding skipped test', () => {
    before(() => {
      test = {
        status: 'skip',
        title: 'Skipped Test'
      }
    })

    beforeEach(() => sinon.spy(reporterOutputLoggerStub, 'skip'))

    afterEach(() => reporterOutputLoggerStub.skip.restore())

    it('should write skip to the console', () => {
      const emitter = new EventEmitter()
      new CLIReporter(emitter, {}, false)
      emitter.emit('test skip', test)
      assert.isOk(reporterOutputLoggerStub.skip.calledOnce)
    })
  })

  describe('when creating report', () => {
    before(() => {
      test = {
        status: 'fail',
        title: 'Failing Test'
      }
    })

    beforeEach(() => sinon.spy(reporterOutputLoggerStub, 'complete'))

    afterEach(() => reporterOutputLoggerStub.complete.restore())

    describe('when there is at least one test', () =>
      it('should write to the console', (done) => {
        const emitter = new EventEmitter()
        const cliReporter = new CLIReporter(emitter, {}, false)
        cliReporter.stats.tests = 1
        emitter.emit('end', () => {
          assert.isOk(reporterOutputLoggerStub.complete.calledTwice)
          done()
        })
      }))

    describe('when there are no tests', () =>
      it('should write to the console', (done) => {
        const emitter = new EventEmitter()
        new CLIReporter(emitter, {}, false)
        emitter.emit('end', () => {
          assert.isOk(reporterOutputLoggerStub.complete.calledOnce)
          done()
        })
      }))
  })
})
