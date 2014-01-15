{EventEmitter} = require 'events'
{assert} = require 'chai'
sinon = require 'sinon'
proxyquire = require('proxyquire').noCallThru()

loggerStub = require '../../../src/logger'
fsStub = require 'fs'

XUnitReporter = proxyquire '../../../src/reporters/x-unit-reporter', {
  './../logger' : loggerStub,
  'fs' : fsStub
}

describe 'XUnitReporter', () ->

  test = {}

  describe 'when creating', () ->

    describe 'when file exists', () ->
      before () ->
        sinon.stub fsStub, 'existsSync', (path) ->
          return true
        sinon.stub fsStub, 'unlinkSync'

      after () ->
        fsStub.existsSync.restore()
        fsStub.unlinkSync.restore()

      it 'should delete the existing file', (done) ->
        emitter = new EventEmitter()
        xUnitReporter = new XUnitReporter(emitter, {}, {}, "test.xml")
        assert.ok fsStub.unlinkSync.calledOnce
        done()

    describe 'when file does not exist', () ->

      before () ->
        sinon.stub fsStub, 'existsSync', (path) ->
          return false
        sinon.stub fsStub, 'unlinkSync'

      after () ->
        fsStub.existsSync.restore()
        fsStub.unlinkSync.restore()

      it 'should create the file', (done) ->
        emitter = new EventEmitter()
        xUnitReporter = new XUnitReporter(emitter, {}, {}, "test.xml")
        assert.ok fsStub.unlinkSync.notCalled
        done()

  describe 'when starting', () ->

    beforeEach () ->
      sinon.stub fsStub, 'appendFile'

    afterEach () ->
      fsStub.appendFile.restore()

    it 'should write opening to file', (done) ->
      emitter = new EventEmitter()
      xUnitReporter = new XUnitReporter(emitter, {}, {})
      emitter.emit 'start'
      assert.ok fsStub.appendFile.called
      done()

  describe 'when ending', () ->

    beforeEach () ->
      sinon.stub fsStub, 'appendFile'

    afterEach () ->
      fsStub.appendFile.restore()

    describe 'when there is one test', () ->

      it 'should write tests to file', (done) ->
        emitter = new EventEmitter()
        xUnitReporter = new XUnitReporter(emitter, {}, {})
        xUnitReporter.tests = [ test ]
        xUnitReporter.stats.tests = 1
        emitter.emit 'end', () ->
          assert.ok fsStub.appendFile.called
          done()

      describe 'when the file writes successfully', () ->

        before () ->
          sinon.stub fsStub, 'readFile'
          fsStub.readFile.yields null, 'da\nta'
          sinon.stub fsStub, 'writeFile'
          fsStub.writeFile.yields null

        after () ->
          fsStub.readFile.restore()
          fsStub.writeFile.restore()

        it 'should read the file and update the stats', (done) ->
          emitter = new EventEmitter()
          xUnitReporter = new XUnitReporter(emitter, {}, {})
          xUnitReporter.tests = [ test ]
          xUnitReporter.stats.tests = 1

          emitter.emit 'end', () ->
            assert.ok fsStub.writeFile.called
            done()

    describe 'when there are no tests', () ->

      it 'should write empty suite', (done) ->
        emitter = new EventEmitter()
        xUnitReporter = new XUnitReporter(emitter, {}, {})
        emitter.emit 'end', () ->
          assert.ok fsStub.appendFile.called
          done()

  describe 'when test passes', () ->

    before () ->
      test =
        status: 'pass'
        title: 'Passing Test'

    beforeEach () ->
      sinon.stub fsStub, 'appendFile'

    afterEach () ->
      fsStub.appendFile.restore()

    it 'should write a passing test', (done) ->
      emitter = new EventEmitter()
      xUnitReporter = new XUnitReporter(emitter, {}, {}, "test.xml")
      emitter.emit 'test start', test
      emitter.emit 'test pass', test
      assert.ok fsStub.appendFile.called
      done()

    describe 'when details=true', () ->

      it 'should write details for passing tests', (done) ->
        emitter = new EventEmitter()
        cliReporter = new XUnitReporter(emitter, {}, {}, "test.xml", true)
        emitter.emit 'test start', test
        emitter.emit 'test pass', test
        assert.ok fsStub.appendFile.called
        done()

  describe 'when test is skipped', () ->
    before () ->
      test =
        status: 'skipped'
        title: 'Skipped Test'

    beforeEach () ->
      sinon.stub fsStub, 'appendFile'

    afterEach () ->
      fsStub.appendFile.restore()

    it 'should write a skipped test', (done) ->
      emitter = new EventEmitter()
      xUnitReporter = new XUnitReporter(emitter, {}, {}, "test.xml")
      emitter.emit 'test start', test
      emitter.emit 'test skip', test
      assert.ok fsStub.appendFile.called
      done()

  describe 'when test fails', () ->

    before () ->
      test =
        status: 'failed'
        title: 'Failed Test'

    beforeEach () ->
      sinon.stub fsStub, 'appendFile'

    afterEach () ->
      fsStub.appendFile.restore()

    it 'should write a failed test', (done) ->
      emitter = new EventEmitter()
      xUnitReporter = new XUnitReporter(emitter, {}, {}, "test.xml")
      emitter.emit 'test start', test
      emitter.emit 'test fail', test
      assert.ok fsStub.appendFile.called
      done()

  describe 'when test errors', () ->

    before () ->
      test =
        status: 'error'
        title: 'Errored Test'

    beforeEach () ->
      sinon.stub fsStub, 'appendFile'

    afterEach () ->
      fsStub.appendFile.restore()

    it 'should write an error test', (done) ->
      emitter = new EventEmitter()
      xUnitReporter = new XUnitReporter(emitter, {}, {}, "test.xml")
      emitter.emit 'test start', test
      emitter.emit 'test error', new Error('Error'), test
      assert.ok fsStub.appendFile.called
      done()
