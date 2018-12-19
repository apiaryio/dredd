const { assert } = require('chai');

const sandboxHooksCode = require('../../lib/sandboxHooksCode');

describe('sandboxHooksCode(hooksCode, callback)', () => {
  it('should be a defined function', () => assert.isFunction(sandboxHooksCode));

  describe('when hookscode explodes', () =>
    it('should return an error in callback', (done) => {
      const hooksCode = '\nthrow(new Error("Exploded during sandboxed processing of hook file"));\n';
      sandboxHooksCode(hooksCode, (err) => {
        assert.include(err, 'sandbox');
        done();
      });
    })
  );

  describe('context of code adding hooks', () => {
    it('should not have access to this context', (done) => {
      const contextVar = 'a';
      const hooksCode = '\ncontextVar = "b";\n';
      sandboxHooksCode(hooksCode, () => {
        assert.equal(contextVar, 'a');
        done();
      });
    });

    it('should not have access to require', (done) => {
      const hooksCode = '\nrequire(\'fs\');\n';
      sandboxHooksCode(hooksCode, (err) => {
        assert.include(err, 'require');
        done();
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

    functions.forEach((name) => {
      it(`should have defined function '${name}'`, (done) => {
        const hooksCode = `\
if(typeof(${name}) !== 'function'){
throw(new Error('${name} is not a function'))
}\
`;
        sandboxHooksCode(hooksCode, (err) => {
          assert.isUndefined(err);
          done();
        });
      });
    });

    it('should pass result object to the second callback argument', (done) => {
      const hooksCode = '';
      sandboxHooksCode(hooksCode, (err, result) => {
        if (err) { return done(err); }
        assert.isObject(result);
        done();
      });
    });
  });

  describe('result object', () => {
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

    properties.forEach((property) => {
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

        sandboxHooksCode(hooksCode, (err, result) => {
          if (err) { return done(err); }
          assert.property(result, property);
          done();
        });
      });
    });
  });
});
