const {assert} = require('chai');
const clone = require('clone');

const mergeSandboxedHooks = require('../../src/merge-sandboxed-hooks');

describe('mergeSandboxedHooks', function() {
  it('should be a defined function', () => assert.isFunction(mergeSandboxedHooks));

  const originObject = {
    beforeAll: ['original'],
    beforeEach: ['original'],
    before: {"Transaction Name": ["original"]},
    after: {"Transaction Name": ["original"]},
    afterEach: ['original'],
    afterAll: ['original']
  };

  const toBeMergedObject = {
    beforeAll: ['merged'],
    beforeEach: ['merged'],
    before: {"Transaction Name": ["merged"]},
    after: {"Transaction Name": ["merged"]},
    afterEach: ['merged'],
    afterAll: ['merged']
  };

  let originalHooks = {};
  let hooksToBeMerged = {};
  let object = null;

  beforeEach(function() {
    originalHooks = clone(originObject);
    return hooksToBeMerged = clone(toBeMergedObject);
  });

  it('should return an object', () => assert.isObject(mergeSandboxedHooks(originalHooks, hooksToBeMerged)));

  it('should not change origin hooks object', function() {
    mergeSandboxedHooks(originalHooks, hooksToBeMerged);
    return assert.deepEqual(originalHooks, originObject);
  });

  it('should not change to-be-merged hooks object', function() {
    mergeSandboxedHooks(originalHooks, hooksToBeMerged);
    return assert.deepEqual(hooksToBeMerged, toBeMergedObject);
  });

  return describe('returned obejct', function() {
    beforeEach(() => object = mergeSandboxedHooks(originalHooks, hooksToBeMerged));

    it('beforeAll property', function() {
      assert.equal(object['beforeAll'][0], 'original');
      return assert.equal(object['beforeAll'][1], 'merged');
    });

    it('beforeEach property', function() {
      assert.equal(object['beforeEach'][0], 'original');
      return assert.equal(object['beforeEach'][1], 'merged');
    });

    it('before property', function() {
      assert.equal(object['before']["Transaction Name"][0], 'original');
      return assert.equal(object['before']["Transaction Name"][1], 'merged');
    });

    it('after property', function() {
      assert.equal(object['after']["Transaction Name"][0], 'original');
      return assert.equal(object['after']["Transaction Name"][1], 'merged');
    });

    it('aferEach property', function() {
      assert.equal(object['afterEach'][0], 'original');
      return assert.equal(object['afterEach'][1], 'merged');
    });

    return it('afterAll property', function() {
      assert.equal(object['afterAll'][0], 'original');
      return assert.equal(object['afterAll'][1], 'merged');
    });
  });
});
