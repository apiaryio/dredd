const clone = require('clone');
const proxyquire = require('proxyquire');
const sinon = require('sinon');
const { assert } = require('chai');

const hooksLogStubSpy = sinon.spy(require('../../lib/hooksLog'));

const hooksLogSandboxed = proxyquire('../../lib/hooksLogSandboxed', {
  './hooksLog': hooksLogStubSpy
});

describe('hooksLogSandboxed()', () => {
  const exampleLog = [
    { content: 'some text' }
  ];

  describe('basic functionality', () => {
    it('should push message to the passed array and return the new array', () => {
      const originLogs = [];
      const data = hooksLogSandboxed(originLogs, 'one message');
      assert.isArray(data);
      assert.lengthOf(data, 1);
      assert.strictEqual(data, originLogs);
      assert.deepEqual(data, originLogs);
      assert.propertyVal(data[0], 'content', 'one message');
    });

    it('should push message to undefined logs and return new array instead', () => {
      const originLogs = undefined;
      const data = hooksLogSandboxed(originLogs, 'another message');
      assert.isArray(data);
      assert.lengthOf(data, 1);
      assert.isUndefined(originLogs);
      assert.notDeepEqual(data, originLogs);
      assert.propertyVal(data[0], 'content', 'another message');
    });

    it('should append message to an existing logs array', () => {
      const originLogs = clone(exampleLog);
      const data = hooksLogSandboxed(originLogs, 'some other idea');
      assert.isArray(data);
      assert.lengthOf(data, 2);
      assert.deepEqual(data, originLogs);
      assert.deepEqual(data[0], exampleLog[0]);
      assert.propertyVal(data[1], 'content', 'some other idea');
    });
  });

  describe('passes arguments further to hooksLog', () => {
    beforeEach(() => hooksLogStubSpy.resetHistory());

    it('should pass two arguments if only two were used', () => {
      const originLogs = clone(exampleLog);
      const data = hooksLogSandboxed(originLogs, 'writing elsewhere');
      assert.isTrue(hooksLogStubSpy.called);
      assert.equal(hooksLogStubSpy.callCount, 1);
      const call = hooksLogStubSpy.getCall(0);
      assert.deepEqual(call.args[0][0], exampleLog[0]);
      assert.isNull(call.args[1]); // Second argument is logger, but sandbox log does not use it
      assert.equal(call.args[2], 'writing elsewhere');
      assert.isUndefined(call.args[3]);
      assert.isUndefined(call.args[4]);
      assert.isArray(data);
      assert.lengthOf(data, 2);
    });
  });
});
