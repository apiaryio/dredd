const clone = require('clone');
const sinon = require('sinon');
const util = require('util');

const { assert } = require('chai');

const hooksLog = require('../../lib/hooksLog');
const loggerStub = require('../../lib/logger');

describe('hooksLog()', () => {
  const exampleLogs = [
    { content: 'some text' },
  ];

  before(() => {
    sinon.stub(loggerStub, 'log').callsFake(() => { });
    sinon.stub(loggerStub, 'debug').callsFake(() => { });
    sinon.stub(loggerStub, 'hook').callsFake(() => { });
  });

  after(() => {
    loggerStub.log.restore();
    loggerStub.debug.restore();
    loggerStub.hook.restore();
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
    assert.strictEqual(data[1].content, util.format({ hello: 'object world' }));
  });

  describe('functionality', () => {
    beforeEach(() => {
      loggerStub.log.resetHistory();
      loggerStub.debug.resetHistory();
      loggerStub.hook.resetHistory();
    });

    it('should push message to the passed array and return the new array', () => {
      const originLogs = [];
      const data = hooksLog(originLogs, loggerStub, 'one message');
      assert.isArray(data);
      assert.lengthOf(data, 1);
      assert.strictEqual(data, originLogs);
      assert.deepEqual(data, originLogs);
      assert.propertyVal(data[0], 'content', 'one message');
    });

    it('should push message to undefined logs and return new array instead', () => {
      const originLogs = undefined;
      const data = hooksLog(originLogs, loggerStub, 'another message');
      assert.isArray(data);
      assert.lengthOf(data, 1);
      assert.isUndefined(originLogs);
      assert.notDeepEqual(data, originLogs);
      assert.propertyVal(data[0], 'content', 'another message');
    });

    it('should append message to an existing logs array', () => {
      const originLogs = clone(exampleLogs);
      const data = hooksLog(originLogs, loggerStub, 'some other idea');
      assert.isArray(data);
      assert.lengthOf(data, 2);
      assert.deepEqual(data, originLogs);
      assert.deepEqual(data[0], exampleLogs[0]);
      assert.propertyVal(data[1], 'content', 'some other idea');
    });

    it('should use "hook" logger level', () => {
      hooksLog([], loggerStub, 'there is a log');

      assert.isTrue(loggerStub.hook.called);
      assert.equal(loggerStub.hook.callCount, 1);

      assert.isFalse(loggerStub.log.called);
      assert.isFalse(loggerStub.debug.called);

      assert.equal(loggerStub.hook.getCall(0).args[0], 'there is a log');
    });
  });
});
