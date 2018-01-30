/* eslint-disable
    no-unused-vars,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
const { assert } = require('chai');
const clone = require('clone');
const proxyquire = require('proxyquire');
const sinon = require('sinon');
const util = require('util');

const loggerStub = require('../../src/logger');
const hooksLog = require('../../src/hooks-log');

describe('hooksLog()', () => {
  const exampleLogs = [
    { content: 'some text' }
  ];

  before(() => {
    sinon.stub(loggerStub, 'log').callsFake(() => { });
    sinon.stub(loggerStub, 'debug').callsFake(() => { });
    return sinon.stub(loggerStub, 'hook').callsFake(() => { });
  });

  after(() => {
    loggerStub.log.restore();
    loggerStub.debug.restore();
    return loggerStub.hook.restore();
  });

  it('should print using util.format only when content is an object type', () => {
    const data = hooksLog(clone(exampleLogs), loggerStub, { hello: 'object world' });
    assert.equal(loggerStub.hook.callCount, 1);
    assert.deepEqual(loggerStub.hook.getCall(0).args[0], { hello: 'object world' });
    assert.lengthOf(data, 2);
    assert.isObject(data[1]);
    assert.property(data[1], 'content');
    assert.property(data[1], 'timestamp');
    assert.isString(data[1].content);
    return assert.strictEqual(data[1].content, util.format({ hello: 'object world' }));
  });

  return describe('functionality', () => {
    beforeEach(() => {
      loggerStub.log.reset();
      loggerStub.debug.reset();
      return loggerStub.hook.reset();
    });

    it('should push message to the passed array and return the new array', () => {
      const originLogs = [];
      const data = hooksLog(originLogs, loggerStub, 'one message');
      assert.isArray(data);
      assert.lengthOf(data, 1);
      assert.strictEqual(data, originLogs);
      assert.deepEqual(data, originLogs);
      return assert.propertyVal(data[0], 'content', 'one message');
    });

    it('should push message to undefined logs and return new array instead', () => {
      const originLogs = undefined;
      const data = hooksLog(originLogs, loggerStub, 'another message');
      assert.isArray(data);
      assert.lengthOf(data, 1);
      assert.isUndefined(originLogs);
      assert.notDeepEqual(data, originLogs);
      return assert.propertyVal(data[0], 'content', 'another message');
    });

    it('should append message to an existing logs array', () => {
      const originLogs = clone(exampleLogs);
      const data = hooksLog(originLogs, loggerStub, 'some other idea');
      assert.isArray(data);
      assert.lengthOf(data, 2);
      assert.deepEqual(data, originLogs);
      assert.deepEqual(data[0], exampleLogs[0]);
      return assert.propertyVal(data[1], 'content', 'some other idea');
    });

    return it('should use "hook" logger level', () => {
      hooksLog([], loggerStub, 'there is a log');

      assert.isTrue(loggerStub.hook.called);
      assert.equal(loggerStub.hook.callCount, 1);

      assert.isFalse(loggerStub.log.called);
      assert.isFalse(loggerStub.debug.called);

      return assert.equal(loggerStub.hook.getCall(0).args[0], 'there is a log');
    });
  });
});
