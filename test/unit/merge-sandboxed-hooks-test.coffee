{assert} = require 'chai'
clone = require 'clone'

mergeSandboxedHooks = require '../../src/merge-sandboxed-hooks'

describe 'mergeSandboxedHooks', () ->
  it 'should be a defined function', () ->
    assert.isFunction mergeSandboxedHooks

  originalHooks = {}
  hooksToBeMerged = {}
  object = null
  beforeEach () ->
    originalHooks = clone {
      beforeAll: ['original']
      beforeEach: ['original']
      before: {"Transaction Name": ["original"]}
      after: {"Transaction Name": ["original"]}
      afterEach: ['original']
      afterAll: ['original']
    }

    hooksToBeMerged = clone {
      beforeAll: ['merged']
      beforeEach: ['merged']
      before: {"Transaction Name": ["merged"]}
      after: {"Transaction Name": ["merged"]}
      afterEach: ['merged']
      afterAll: ['merged']
    }
  it 'should return an object', () ->
    assert.isObject mergeSandboxedHooks(originalHooks, hooksToBeMerged)

  describe 'returned obejct', () ->
    beforeEach () ->
      object = mergeSandboxedHooks(originalHooks, hooksToBeMerged)

    it 'beforeAll property', () ->
      assert.equal object['beforeAll'][0], 'original'
      assert.equal object['beforeAll'][1], 'merged'

    it 'beforeEach property', () ->
      assert.equal object['beforeEach'][0], 'original'
      assert.equal object['beforeEach'][1], 'merged'

    it 'before property', () ->
      assert.equal object['before']["Transaction Name"][0], 'original'
      assert.equal object['before']["Transaction Name"][1], 'merged'

    it 'after property', () ->
      assert.equal object['after']["Transaction Name"][0], 'original'
      assert.equal object['after']["Transaction Name"][1], 'merged'

    it 'aferEach property', () ->
      assert.equal object['afterEach'][0], 'original'
      assert.equal object['afterEach'][1], 'merged'

    it 'afterAll property', () ->
      assert.equal object['afterAll'][0], 'original'
      assert.equal object['afterAll'][1], 'merged'
