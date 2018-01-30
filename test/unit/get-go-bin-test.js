const {assert} = require('chai');
const sinon = require('sinon');
const path = require('path');
const childProcess = require('child_process');

const getGoBin = require('../../src/get-go-bin');


describe('getGoBin()', function() {
  let goBin = undefined;
  let goPath = undefined;

  beforeEach( function() {
    goBin = process.env.GOBIN;
    delete process.env.GOBIN;
    goPath = process.env.GOPATH;
    return delete process.env.GOPATH;
  });
  afterEach( function() {
    process.env.GOBIN = goBin;
    return process.env.GOPATH = goPath;
  });

  describe('when $GOBIN is set', function() {
    let callbackArgs = undefined;

    beforeEach(function(done) {
      process.env.GOBIN = path.join('dummy', 'gobin', 'path');
      return getGoBin(function(...args) {
        callbackArgs = args;
        return done();
      });
    });

    return it('resolves as $GOBIN', () => assert.deepEqual(callbackArgs, [null, path.join('dummy', 'gobin', 'path')]));
  });

  describe('when $GOPATH is set', function() {
    let callbackArgs = undefined;

    beforeEach(function(done) {
      process.env.GOPATH = path.join('dummy', 'gopath', 'path');
      return getGoBin(function(...args) {
        callbackArgs = args;
        return done();
      });
    });

    return it('resolves as $GOPATH + /bin', () => assert.deepEqual(callbackArgs, [null, path.join('dummy', 'gopath', 'path', 'bin')]));
  });

  describe('when both $GOBIN and $GOPATH are set', function() {
    let callbackArgs = undefined;

    beforeEach(function(done) {
      process.env.GOBIN = path.join('dummy', 'gobin', 'path');
      process.env.GOPATH = path.join('dummy', 'gopath', 'path');
      return getGoBin(function(...args) {
        callbackArgs = args;
        return done();
      });
    });

    return it('resolves as $GOBIN', () => assert.deepEqual(callbackArgs, [null, path.join('dummy', 'gobin', 'path')]));
  });

  describe('when neither $GOBIN nor $GOPATH are set', function() {
    let callbackArgs = undefined;

    beforeEach(function(done) {
      sinon.stub(childProcess, 'exec').callsFake((command, callback) => callback(null, path.join('dummy', 'gopath', 'path')));
      return getGoBin(function(...args) {
        callbackArgs = args;
        return done();
      });
    });
    afterEach( () => childProcess.exec.restore());

    return it('calls \'go env GOPATH\' + /bin', () => assert.deepEqual(callbackArgs, [null, path.join('dummy', 'gopath', 'path', 'bin')]));
  });

  return describe('when \'go env GOPATH\' fails', function() {
    const error = new Error('Ouch!');
    let callbackArgs = undefined;

    beforeEach(function(done) {
      sinon.stub(childProcess, 'exec').callsFake((command, callback) => callback(error));
      return getGoBin(function(...args) {
        callbackArgs = args;
        return done();
      });
    });
    afterEach( () => childProcess.exec.restore());

    return it('propagates the error', () => assert.deepEqual(callbackArgs, [error]));
  });
});
