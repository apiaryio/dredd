/* eslint-disable
    no-return-assign,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
const { assert } = require('chai');
const sinon = require('sinon');
const path = require('path');
const childProcess = require('child_process');

const getGoBin = require('../../src/get-go-bin');


describe('getGoBin()', () => {
  let goBin;
  let goPath;

  beforeEach(() => {
    goBin = process.env.GOBIN;
    delete process.env.GOBIN;
    goPath = process.env.GOPATH;
    return delete process.env.GOPATH;
  });
  afterEach(() => {
    process.env.GOBIN = goBin;
    return process.env.GOPATH = goPath;
  });

  describe('when $GOBIN is set', () => {
    let callbackArgs;

    beforeEach((done) => {
      process.env.GOBIN = path.join('dummy', 'gobin', 'path');
      return getGoBin((...args) => {
        callbackArgs = args;
        return done();
      });
    });

    return it('resolves as $GOBIN', () => assert.deepEqual(callbackArgs, [null, path.join('dummy', 'gobin', 'path')]));
  });

  describe('when $GOPATH is set', () => {
    let callbackArgs;

    beforeEach((done) => {
      process.env.GOPATH = path.join('dummy', 'gopath', 'path');
      return getGoBin((...args) => {
        callbackArgs = args;
        return done();
      });
    });

    return it('resolves as $GOPATH + /bin', () => assert.deepEqual(callbackArgs, [null, path.join('dummy', 'gopath', 'path', 'bin')]));
  });

  describe('when both $GOBIN and $GOPATH are set', () => {
    let callbackArgs;

    beforeEach((done) => {
      process.env.GOBIN = path.join('dummy', 'gobin', 'path');
      process.env.GOPATH = path.join('dummy', 'gopath', 'path');
      return getGoBin((...args) => {
        callbackArgs = args;
        return done();
      });
    });

    return it('resolves as $GOBIN', () => assert.deepEqual(callbackArgs, [null, path.join('dummy', 'gobin', 'path')]));
  });

  describe('when neither $GOBIN nor $GOPATH are set', () => {
    let callbackArgs;

    beforeEach((done) => {
      sinon.stub(childProcess, 'exec').callsFake((command, callback) => callback(null, path.join('dummy', 'gopath', 'path')));
      return getGoBin((...args) => {
        callbackArgs = args;
        return done();
      });
    });
    afterEach(() => childProcess.exec.restore());

    return it('calls \'go env GOPATH\' + /bin', () => assert.deepEqual(callbackArgs, [null, path.join('dummy', 'gopath', 'path', 'bin')]));
  });

  return describe('when \'go env GOPATH\' fails', () => {
    const error = new Error('Ouch!');
    let callbackArgs;

    beforeEach((done) => {
      sinon.stub(childProcess, 'exec').callsFake((command, callback) => callback(error));
      return getGoBin((...args) => {
        callbackArgs = args;
        return done();
      });
    });
    afterEach(() => childProcess.exec.restore());

    return it('propagates the error', () => assert.deepEqual(callbackArgs, [error]));
  });
});
