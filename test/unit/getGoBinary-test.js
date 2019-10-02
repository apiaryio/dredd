import childProcess from 'child_process';
import path from 'path';
import sinon from 'sinon';
import { assert } from 'chai';

import getGoBinary from '../../lib/getGoBinary';

describe('getGoBinary()', () => {
  let goBin;
  let goPath;

  beforeEach(() => {
    goBin = process.env.GOBIN;
    delete process.env.GOBIN;
    goPath = process.env.GOPATH;
    delete process.env.GOPATH;
  });

  afterEach(() => {
    process.env.GOBIN = goBin;
    process.env.GOPATH = goPath;
  });

  describe('when $GOBIN is set', () => {
    let callbackArgs;

    beforeEach((done) => {
      process.env.GOBIN = path.join('dummy', 'gobin', 'path');
      getGoBinary((...args) => {
        callbackArgs = args;
        done();
      });
    });

    it('resolves as $GOBIN', () =>
      assert.deepEqual(callbackArgs, [
        null,
        path.join('dummy', 'gobin', 'path'),
      ]));
  });

  describe('when $GOPATH is set', () => {
    let callbackArgs;

    beforeEach((done) => {
      process.env.GOPATH = path.join('dummy', 'gopath', 'path');
      getGoBinary((...args) => {
        callbackArgs = args;
        done();
      });
    });

    it('resolves as $GOPATH + /bin', () =>
      assert.deepEqual(callbackArgs, [
        null,
        path.join('dummy', 'gopath', 'path', 'bin'),
      ]));
  });

  describe('when both $GOBIN and $GOPATH are set', () => {
    let callbackArgs;

    beforeEach((done) => {
      process.env.GOBIN = path.join('dummy', 'gobin', 'path');
      process.env.GOPATH = path.join('dummy', 'gopath', 'path');
      getGoBinary((...args) => {
        callbackArgs = args;
        done();
      });
    });

    it('resolves as $GOBIN', () =>
      assert.deepEqual(callbackArgs, [
        null,
        path.join('dummy', 'gobin', 'path'),
      ]));
  });

  describe('when neither $GOBIN nor $GOPATH are set', () => {
    let callbackArgs;

    beforeEach((done) => {
      sinon
        .stub(childProcess, 'exec')
        .callsFake((command, callback) =>
          callback(null, path.join('dummy', 'gopath', 'path')),
        );
      getGoBinary((...args) => {
        callbackArgs = args;
        done();
      });
    });
    after(() => childProcess.exec.restore());

    it("calls 'go env GOPATH' + /bin", () =>
      assert.deepEqual(callbackArgs, [
        null,
        path.join('dummy', 'gopath', 'path', 'bin'),
      ]));
  });

  describe("when 'go env GOPATH' fails", () => {
    const error = new Error('Ouch!');
    let callbackArgs;

    beforeEach((done) => {
      sinon
        .stub(childProcess, 'exec')
        .callsFake((command, callback) => callback(error));
      getGoBinary((...args) => {
        callbackArgs = args;
        done();
      });
    });
    after(() => childProcess.exec.restore());

    it('propagates the error', () => assert.deepEqual(callbackArgs, [error]));
  });
});
