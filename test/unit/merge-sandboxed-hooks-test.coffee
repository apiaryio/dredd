{assert} = require 'chai'
clone = require 'clone'

mergeSandboxedHooks = require '../../src/merge-sandboxed-hooks'

describe 'mergeSandboxedHooks', () ->
  it 'should be a defined function', () ->
    assert.isFunction mergeSandboxedHooks

  originObject = {
    beforeAll: ['original']
    beforeEach: ['original']
    before: {"Transaction Name": ["original"]}
    after: {"Transaction Name": ["original"]}
    afterEach: ['original']
    afterAll: ['original']
  }

  toBeMergedObject = {
    beforeAll: ['merged']
    beforeEach: ['merged']
    before: {"Transaction Name": ["merged"]}
    after: {"Transaction Name": ["merged"]}
    afterEach: ['merged']
    afterAll: ['merged']
  }

  originalHooks = {}
  hooksToBeMerged = {}
  object = null

  beforeEach () ->
    originalHooks = clone originObject
    hooksToBeMerged = clone toBeMergedObject

  it 'should return an object', () ->
    assert.isObject mergeSandboxedHooks(originalHooks, hooksToBeMerged)

  it 'should not change origin hooks object', () ->
    mergeSandboxedHooks(originalHooks, hooksToBeMerged)
    assert.deepEqual originalHooks, originObject

  it 'should not change to-be-merged hooks object', () ->
    mergeSandboxedHooks(originalHooks, hooksToBeMerged)
    assert.deepEqual hooksToBeMerged, toBeMergedObject

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
