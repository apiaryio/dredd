{assert} = require 'chai'
clone = require 'clone'
proxyquire = require 'proxyquire'
sinon = require 'sinon'

hooksLogStubSpy = sinon.spy require '../../src/hooks-log'

hooksLogSandboxed = proxyquire '../../src/hooks-log-sandboxed', {
  './hooks-log': hooksLogStubSpy
}


describe 'hooksLogSandboxed()', () ->
  exampleLog = [
    content: 'some text'
  ]

  describe 'basic functionality', ->
    it 'should push message to the passed array and return the new array', ->
      originLogs = []
      data = hooksLogSandboxed originLogs, 'one message'
      assert.isArray data
      assert.lengthOf data, 1
      assert.strictEqual data, originLogs
      assert.deepEqual data, originLogs
      assert.deepPropertyVal data[0], 'content', 'one message'

    it 'should push message to undefined logs and return new array instead', ->
      originLogs = undefined
      data = hooksLogSandboxed originLogs, 'another message'
      assert.isArray data
      assert.lengthOf data, 1
      assert.isUndefined originLogs
      assert.notDeepEqual data, originLogs
      assert.deepPropertyVal data[0], 'content', 'another message'

    it 'should append message to an existing logs array', ->
      originLogs = clone exampleLog
      data = hooksLogSandboxed originLogs, 'some other idea'
      assert.isArray data
      assert.lengthOf data, 2
      assert.deepEqual data, originLogs
      assert.deepEqual data[0], exampleLog[0]
      assert.deepPropertyVal data[1], 'content', 'some other idea'

  describe 'passes arguments further to hooks-log', ->
    beforeEach ->
      hooksLogStubSpy.reset()

    it 'should pass two arguments if only two were used', ->
      originLogs = clone exampleLog
      data = hooksLogSandboxed originLogs, 'writing elsewhere'
      assert.isTrue hooksLogStubSpy.called
      assert.equal hooksLogStubSpy.callCount, 1
      call = hooksLogStubSpy.getCall(0)
      assert.deepEqual call.args[0][0], exampleLog[0]
      assert.isNull call.args[1] # second argument is logger, but sandbox log does not use it
      assert.equal call.args[2], 'writing elsewhere'
      assert.isUndefined call.args[3]
      assert.isUndefined call.args[4]
      assert.isArray data
      assert.lengthOf data, 2
