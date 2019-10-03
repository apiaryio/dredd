import clone from 'clone';
import sinon from 'sinon';
import util from 'util';

import { assert } from 'chai';

import hooksLog from '../../lib/hooksLog';
import reporterOutputLoggerStub from '../../lib/reporters/reporterOutputLogger';

describe('hooksLog()', () => {
  const exampleLogs = [{ content: 'some text' }];

  before(() => {
    sinon.stub(reporterOutputLoggerStub, 'hook').callsFake(() => {});
  });

  after(() => {
    reporterOutputLoggerStub.hook.restore();
  });

  it('should print using util.format only when content is an object type', () => {
    const data = hooksLog(clone(exampleLogs), reporterOutputLoggerStub, {
      hello: 'object world',
    });
    assert.equal(reporterOutputLoggerStub.hook.callCount, 1);
    assert.deepEqual(reporterOutputLoggerStub.hook.getCall(0).args[0], {
      hello: 'object world',
    });
    assert.lengthOf(data, 2);
    assert.isObject(data[1]);
    assert.property(data[1], 'content');
    assert.property(data[1], 'timestamp');
    assert.isString(data[1].content);
    assert.strictEqual(data[1].content, util.format({ hello: 'object world' }));
  });

  describe('functionality', () => {
    beforeEach(() => {
      reporterOutputLoggerStub.hook.resetHistory();
    });

    it('should push message to the passed array and return the new array', () => {
      const originLogs = [];
      const data = hooksLog(
        originLogs,
        reporterOutputLoggerStub,
        'one message',
      );
      assert.isArray(data);
      assert.lengthOf(data, 1);
      assert.strictEqual(data, originLogs);
      assert.deepEqual(data, originLogs);
      assert.propertyVal(data[0], 'content', 'one message');
    });

    it('should push message to undefined logs and return new array instead', () => {
      const originLogs = undefined;
      const data = hooksLog(
        originLogs,
        reporterOutputLoggerStub,
        'another message',
      );
      assert.isArray(data);
      assert.lengthOf(data, 1);
      assert.isUndefined(originLogs);
      assert.notDeepEqual(data, originLogs);
      assert.propertyVal(data[0], 'content', 'another message');
    });

    it('should append message to an existing logs array', () => {
      const originLogs = clone(exampleLogs);
      const data = hooksLog(
        originLogs,
        reporterOutputLoggerStub,
        'some other idea',
      );
      assert.isArray(data);
      assert.lengthOf(data, 2);
      assert.deepEqual(data, originLogs);
      assert.deepEqual(data[0], exampleLogs[0]);
      assert.propertyVal(data[1], 'content', 'some other idea');
    });

    it('should use "hook" logger level', () => {
      hooksLog([], reporterOutputLoggerStub, 'there is a log');

      assert.isTrue(reporterOutputLoggerStub.hook.called);
      assert.equal(reporterOutputLoggerStub.hook.callCount, 1);

      assert.equal(
        reporterOutputLoggerStub.hook.getCall(0).args[0],
        'there is a log',
      );
    });
  });
});
