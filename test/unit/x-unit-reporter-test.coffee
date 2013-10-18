{assert} = require 'chai'
sinon = require 'sinon'
proxyquire = require('proxyquire').noCallThru()

cliStub = require 'cli'
fsStub = require 'fs'

XUnitReporter = proxyquire '../../src/x-unit-reporter', {
  'cli' : cliStub,
  'fs' : fsStub
}

describe 'XUnitReporter', () ->

  test = {}

  describe 'when creating report', () ->
    beforeEach () ->
      sinon.spy fsStub, 'appendFileSync'

    afterEach () ->
      fsStub.appendFileSync.restore()

    describe 'when there is one test', () ->

      it 'should write tests to file', (done) ->
        xUnitReporter = new XUnitReporter()
        xUnitReporter.addTest { status: 'fail', title: 'Failing Test' }, () ->
          xUnitReporter.addTest { status: 'pass', title: 'Passing Test' }, () ->
            xUnitReporter.createReport () ->
              assert.ok fsStub.appendFileSync.called
              fsStub.unlinkSync(xUnitReporter.path)
              done()

    describe 'when there are no tests', () ->

      it 'should write empty suite', (done) ->
        xUnitReporter = new XUnitReporter()
        xUnitReporter.createReport () ->
          assert.ok fsStub.appendFileSync.calledTwice
          fsStub.unlinkSync(xUnitReporter.path)
          done()
