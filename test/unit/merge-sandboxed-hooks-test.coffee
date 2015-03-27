{assert} = require 'chai'
clone = require 'clone'

mergeSandboxedHooks = require '../../src/merge-sandboxed-hooks'

describe.skip 'mergeSandboxedHooks', () ->
  # it 'should be a defined function', () ->
  #   assert.isFunction mergeSandboxedHooks

  # originalHooks = {}
  # hooksToBeMerged = {}

  # beforeEach () ->
  #   originalHooks = clone {
  #     beforeAll: ['original']
  #     beforeEach: ['original']
  #     before: {"Transaction Name": ["original"]}
  #     after: {"Transaction Name": ["original"]}
  #     afterEach: ['original']
  #     afterAll: ['original']
  #   }

  #   hooksToBeMerged = clone {
  #     beforeAll: ['merged']
  #     beforeEach: ['merged']
  #     before: {"Transaction Name": ["merged"]}
  #     after: {"Transaction Name": ["merged"]}
  #     afterEach: ['merged']
  #     afterAll: ['merged']
  #   }

  # it 'should return an object', () ->
  #   assert.isObject mergeSandboxedHooks(originalHooks,hooksToBeMerged)


  # describe 'beforeAll property', () ->
  #   object = mergeSandboxedHooks(originalHooks,hooksToBeMerged)
  #   console.log object
  #   assert.equal object['beforeAll'][0], 'original'
  #   assert.equal object['beforeAll'][1], 'merged'

  # describe 'beforeEach property', () ->
  #   object = mergeSandboxedHooks(originalHooks,hooksToBeMerged)
  #   assert.equal object['beforeEach'][0], 'original'
  #   assert.equal object['beforeEach'][1], 'merged'

  # describe 'before property', () ->
  #   object = mergeSandboxedHooks(originalHooks,hooksToBeMerged)
  #   assert.equal object['before']["Transaction Name"][0], 'original'
  #   assert.equal object['before']["Transaction Name"][1], 'merged'

  # describe 'after property', () ->
  #   object = mergeSandboxedHooks(originalHooks,hooksToBeMerged)
  #   assert.equal object['after']["Transaction Name"][0], 'original'
  #   assert.equal object['after']["Transaction Name"][1], 'merged'

  # describe 'aferEach property', () ->
  #   object = mergeSandboxedHooks(originalHooks,hooksToBeMerged)
  #   assert.equal object['afterEach'][0], 'original'
  #   assert.equal object['afterEach'][1], 'merged'

  # describe 'afterAll property', () ->
  #   object = mergeSandboxedHooks(originalHooks,hooksToBeMerged)
  #   assert.equal object['afterAll'][0], 'original'
  #   assert.equal object['afterAll'][1], 'merged'
