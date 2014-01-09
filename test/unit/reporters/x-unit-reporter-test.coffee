{EventEmitter} = require 'events'
{assert} = require 'chai'
sinon = require 'sinon'
proxyquire = require('proxyquire').noCallThru()

cliStub = require 'cli'
fsStub = require 'fs'

XUnitReporter = proxyquire '../../../src/reporters/x-unit-reporter', {
  'cli' : cliStub,
  'fs' : fsStub
}

describe 'XUnitReporter', () ->

  test = {}

  describe 'when creating report', () ->
    beforeEach () ->
      sinon.spy fsStub, 'appendFile'

    afterEach () ->
      fsStub.appendFile.restore()

    describe 'when there is one test', () ->

      it 'should write tests to file', (done) ->
        emitter = new EventEmitter()
        xUnitReporter = new XUnitReporter(emitter, {}, {}, false)
        xUnitReporter.tests = [ test ]
        xUnitReporter.stats.tests = 1
        emitter.emit 'end'
        assert.ok fsStub.appendFile.called
        done()

    describe 'when there are no tests', () ->

      it 'should write empty suite', (done) ->
        emitter = new EventEmitter()
        xUnitReporter = new XUnitReporter(emitter, {}, {}, false)
        emitter.emit 'end'
        assert.ok fsStub.appendFile.called
        done()
