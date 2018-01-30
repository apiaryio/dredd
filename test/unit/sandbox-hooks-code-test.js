/* eslint-disable
    no-multi-str,
    no-shadow,
    no-unused-vars,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
const { assert } = require('chai');

const sandboxHooksCode = require('../../src/sandbox-hooks-code');

describe('sandboxHooksCode(hooksCode, callback)', () => {
  it('should be a defined function', () => assert.isFunction(sandboxHooksCode));

  describe('when hookscode explodes', () =>
    it('should return an error in callback', (done) => {
      const hooksCode = '\
throw(new Error("Exploded during sandboxed processing of hook file"));\
';
      return sandboxHooksCode(hooksCode, (err, result) => {
        assert.include(err, 'sandbox');
        return done();
      });
    })
  );

  describe('context of code adding hooks', () => {
    it('should not have access to this context', (done) => {
      const contextVar = 'a';
      const hooksCode = '\
contextVar = "b";\
';
      return sandboxHooksCode(hooksCode, (err, result) => {
        assert.equal(contextVar, 'a');
        return done();
      });
    });

    it('should not have access to require', (done) => {
      const contextVar = '';
      const hooksCode = '\
require(\'fs\');\
';
      return sandboxHooksCode(hooksCode, (err, result) => {
        assert.include(err, 'require');
        return done();
      });
    });

    const functions = [
      'before',
      'after',
      'beforeAll',
      'afterAll',
      'beforeEach',
      'afterEach',
      'beforeEachValidation',
      'beforeValidation'
    ];

    for (const name of functions) {
      (name =>
        it(`should have defined function '${name}'`, (done) => {
          const hooksCode = `\
if(typeof(${name}) !== 'function'){
  throw(new Error('${name} is not a function'))
}\
`;
          return sandboxHooksCode(hooksCode, (err, result) => {
            assert.isUndefined(err);
            return done();
          });
        })
      )(name);
    }

    return it('should pass result object to the second callback argument', (done) => {
      const hooksCode = '';
      return sandboxHooksCode(hooksCode, (err, result) => {
        if (err) { return done(err); }
        assert.isObject(result);
        return done();
      });
    });
  });

  return describe('result object', () => {
    const properties = [
      'beforeAllHooks',
      'beforeEachHooks',
      'beforeHooks',
      'afterHooks',
      'afterEachHooks',
      'afterAllHooks',
      'beforeValidationHooks',
      'beforeEachValidationHooks'
    ];

    return Array.from(properties).map(property => (property =>
      it(`should have property ${property}`, (done) => {
        const hooksCode = `\
var dummyFunc = function(data){
  return true;
}

beforeAll(dummyFunc);
beforeEach(dummyFunc);
before('Transaction Name', dummyFunc);
after('Transaction Name', dummyFunc);
beforeEach(dummyFunc);
afterEach(dummyFunc);
beforeEachValidation(dummyFunc);
beforeValidation('Transaction Name', dummyFunc);\
`;

        return sandboxHooksCode(hooksCode, (err, result) => {
          if (err) { return done(err); }
          assert.property(result, property);
          return done();
        });
      })
    )(property));
  });
});

