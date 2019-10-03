import fsStub from 'fs'
import { noCallThru } from 'proxyquire'
import sinon from 'sinon'

import { assert } from 'chai'
import { EventEmitter } from 'events'

import loggerStub from '../../../lib/logger'
import reporterOutputLoggerStub from '../../../lib/reporters/reporterOutputLogger'

const makeDirStub = (input, options) => makeDirStubImpl(input, options)
let makeDirStubImpl = () => Promise.resolve()
const makeDirStubImplBackup = makeDirStubImpl

const proxyquire = noCallThru()

const MarkdownReporter = proxyquire('../../../lib/reporters/MarkdownReporter', {
  '../logger': loggerStub,
  './reporterOutputLogger': reporterOutputLoggerStub,
  fs: fsStub,
  'make-dir': makeDirStub
}).default

describe('MarkdownReporter', () => {
  let mdReporter
  let emitter
  let stats
  let test = {}

  before(() => {
    loggerStub.transports.console.silent = true
    reporterOutputLoggerStub.transports.console.silent = true
  })

  after(() => {
    loggerStub.transports.console.silent = false
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
    mdReporter = new MarkdownReporter(emitter, stats, 'test.md')
  })

  describe('when creating', () => {
    describe('when file exists', () => {
      before(() => {
        sinon.stub(fsStub, 'existsSync').callsFake(() => true)
        sinon.stub(loggerStub, 'warn')
      })

      after(() => {
        fsStub.existsSync.restore()
        loggerStub.warn.restore()
      })

      it('should warn about the existing file', () =>
        assert.isOk(loggerStub.warn.called))
    })

    describe('when file does not exist', () => {
      before(() => {
        sinon.stub(fsStub, 'existsSync').callsFake(() => false)
        sinon.stub(fsStub, 'unlinkSync')
      })

      after(() => {
        fsStub.existsSync.restore()
        fsStub.unlinkSync.restore()
      })

      it('should create the file', (done) => {
        assert.isOk(fsStub.unlinkSync.notCalled)
        done()
      })
    })
  })

  describe('when starting', () =>
    it('should write the title to the buffer', (done) =>
      emitter.emit('start', '', () => {
        assert.isOk(mdReporter.buf.includes('Dredd'))
        done()
      })))

  describe('when ending', () => {
    describe('when can create output directory', () => {
      beforeEach(() => {
        sinon
          .stub(fsStub, 'writeFile')
          .callsFake((path, data, callback) => callback())
        makeDirStubImpl = sinon.spy(makeDirStubImpl)
      })

      afterEach(() => {
        fsStub.writeFile.restore()
        makeDirStubImpl = makeDirStubImplBackup
      })

      it('should write buffer to file', (done) =>
        emitter.emit('end', () => {
          emitter.emit('end', () => {})
          assert.isOk(makeDirStubImpl.called)
          assert.isOk(fsStub.writeFile.called)
          done()
        }))
    })

    describe('when cannot create output directory', () => {
      beforeEach(() => {
        sinon
          .stub(fsStub, 'writeFile')
          .callsFake((path, data, callback) => callback())
        sinon.stub(reporterOutputLoggerStub, 'error')
        makeDirStubImpl = sinon
          .stub()
          .callsFake(() => Promise.reject(new Error()))
      })

      after(() => {
        fsStub.writeFile.restore()
        reporterOutputLoggerStub.error.restore()
        makeDirStubImpl = makeDirStubImplBackup
      })

      it('should write to log', (done) =>
        emitter.emit('end', () => {
          assert.isOk(makeDirStubImpl.called)
          assert.isOk(fsStub.writeFile.notCalled)
          assert.isOk(reporterOutputLoggerStub.error.called)
          done()
        }))
    })
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

    it('should write pass to the buffer', (done) => {
      assert.isOk(mdReporter.buf.includes('Pass'))
      done()
    })

    describe('when details=true', () =>
      it('should write details for passing tests', (done) => {
        mdReporter.details = true
        emitter.emit('test pass', test)
        assert.isOk(mdReporter.buf.includes('Request'))
        done()
      }))
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

    it('should write skip to the buffer', (done) => {
      assert.isOk(mdReporter.buf.includes('Skip'))
      done()
    })
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

    it('should write fail to the buffer', (done) => {
      assert.isOk(mdReporter.buf.includes('Fail'))
      done()
    })
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

    it('should write error to the buffer', (done) => {
      assert.isOk(mdReporter.buf.includes('Error'))
      done()
    })
  })
})
