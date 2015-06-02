{assert} = require 'chai'
clone = require 'clone'
proxyquire = require 'proxyquire'
sinon = require 'sinon'
util = require 'util'

loggerStub = require '../../src/logger'
hooksLog = require '../../src/hooks-log'

describe 'hooksLog()', () ->
  exampleLogs = [
    content: 'some text'
  ]

  before ->
   sinon.stub loggerStub, 'log', ->
   sinon.stub loggerStub, 'debug', ->
   sinon.stub loggerStub, 'hook', ->

  after ->
    loggerStub.log.restore()
    loggerStub.debug.restore()
    loggerStub.hook.restore()

  it 'should print using util.format only when content is an object type', ->
    data = hooksLog clone(exampleLogs), loggerStub, {'hello': 'object world'}
    assert.equal loggerStub.hook.callCount, 1
    assert.deepEqual loggerStub.hook.getCall(0).args[0], {'hello': 'object world'}
    assert.lengthOf data, 2
    assert.isObject data[1]
    assert.property data[1], 'content'
    assert.property data[1], 'timestamp'
    assert.isString data[1].content
    assert.strictEqual data[1].content, util.format({'hello': 'object world'})

  describe 'functionality', ->
    beforeEach ->
      loggerStub.log.reset()
      loggerStub.debug.reset()
      loggerStub.hook.reset()

    it 'should push message to the passed array and return the new array', ->
      originLogs = []
      data = hooksLog originLogs, loggerStub, 'one message'
      assert.isArray data
      assert.lengthOf data, 1
      assert.strictEqual data, originLogs
      assert.deepEqual data, originLogs
      assert.deepPropertyVal data[0], 'content', 'one message'

    it 'should push message to undefined logs and return new array instead', ->
      originLogs = undefined
      data = hooksLog originLogs, loggerStub, 'another message'
      assert.isArray data
      assert.lengthOf data, 1
      assert.isUndefined originLogs
      assert.notDeepEqual data, originLogs
      assert.deepPropertyVal data[0], 'content', 'another message'

    it 'should append message to an existing logs array', ->
      originLogs = clone exampleLogs
      data = hooksLog originLogs, loggerStub, 'some other idea'
      assert.isArray data
      assert.lengthOf data, 2
      assert.deepEqual data, originLogs
      assert.deepEqual data[0], exampleLogs[0]
      assert.deepPropertyVal data[1], 'content', 'some other idea'

    it 'should use "hook" logger level', ->
      hooksLog [], loggerStub, 'there is a log'

      assert.isTrue loggerStub.hook.called
      assert.equal  loggerStub.hook.callCount, 1

      assert.isFalse loggerStub.log.called
      assert.isFalse loggerStub.debug.called

      assert.equal loggerStub.hook.getCall(0).args[0], 'there is a log'
