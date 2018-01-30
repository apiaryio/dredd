/* eslint-disable
    block-scoped-var,
    guard-for-in,
    no-loop-func,
    no-shadow,
    no-unused-vars,
    no-var,
    vars-on-top,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
const clone = require('clone');
const sinon = require('sinon');
const { assert } = require('chai');


const Hooks = require('../../src/hooks');

describe('Hooks', () => {
  describe('constructor', () => {
    it('should not add @logs or @logger when constructor options are empty', () => {
      const hooks = new Hooks();
      assert.isUndefined(hooks.logs);
      return assert.isUndefined(hooks.logger);
    });

    return it('should add @logs and @logger from passed options', () => {
      const options = {
        logs: [{ content: 'message1' }, { content: 'message2' }],
        logger: {
          hook() {},
          error() {}
        }
      };

      const hooks = new Hooks(options);
      assert.strictEqual(hooks.logs, options.logs);
      return assert.strictEqual(hooks.logger, options.logger);
    });
  });

  describe('#log', () => {
    let options = null;

    beforeEach(() => {
      options = {
        logs: [{ content: 'message1' }, { content: 'message2' }],
        logger: {
          hook() {},
          error() {}
        }
      };
      sinon.spy(options.logger, 'hook');
      return sinon.spy(options.logger, 'error');
    });

    afterEach(() => {
      options.logger.hook.restore();
      return options.logger.error.restore();
    });

    return it('should call @logger.hook when hooks.log is called with 1 argument', () => {
      const hooks = new Hooks(options);
      hooks.log('messageX');
      assert.isTrue(options.logger.hook.called);
      assert.isFalse(options.logger.error.called);
      assert.property(hooks.logs[2], 'timestamp');
      assert.propertyVal(hooks.logs[0], 'content', 'message1');
      assert.propertyVal(hooks.logs[1], 'content', 'message2');
      return assert.propertyVal(hooks.logs[2], 'content', 'messageX');
    });
  });

  describe('#before', () => {
    let hooks = null;

    before(() => {
      hooks = new Hooks();
      return hooks.before('beforeHook', () => '');
    });

    return it('should add to hook collection', () => assert.property(hooks.beforeHooks, 'beforeHook'));
  });

  describe('#beforeValidation', () => {
    let hooks = null;

    before(() => {
      hooks = new Hooks();
      return hooks.beforeValidation('beforeValidationHook', () => '');
    });

    return it('should add to hook collection', () => assert.property(hooks.beforeValidationHooks, 'beforeValidationHook'));
  });

  describe('#after', () => {
    let hooks = null;

    before(() => {
      hooks = new Hooks();
      return hooks.after('afterHook', () => '');
    });

    return it('should add to hook collection', () => assert.property(hooks.afterHooks, 'afterHook'));
  });

  describe('#beforeAll', () => {
    let hooks = null;

    before(() => {
      hooks = new Hooks();
      return hooks.beforeAll(() => '');
    });

    return it('should add to hook collection', () => assert.lengthOf(hooks.beforeAllHooks, 1));
  });

  describe('#afterAll', () => {
    let hooks = null;

    before(() => {
      hooks = new Hooks();
      return hooks.afterAll(() => '');
    });

    return it('should add to hook collection', () => assert.lengthOf(hooks.afterAllHooks, 1));
  });

  describe('#beforeEach', () => {
    let hooks = null;

    before(() => {
      hooks = new Hooks();
      return hooks.beforeEach(() => '');
    });

    return it('should add to hook collection', () => assert.lengthOf(hooks.beforeEachHooks, 1));
  });

  describe('#beforeEachValidation', () => {
    let hooks = null;

    before(() => {
      hooks = new Hooks();
      return hooks.beforeEachValidation(() => '');
    });

    return it('should add to hook collection', () => assert.lengthOf(hooks.beforeEachValidationHooks, 1));
  });


  describe('#afterEach', () => {
    let hooks = null;

    before(() => {
      hooks = new Hooks();
      return hooks.afterEach(() => '');
    });

    return it('should add to hook collection', () => assert.lengthOf(hooks.afterEachHooks, 1));
  });

  return describe('#dumpHooksFunctionsToStrings', () => {
    let hooks = null;

    beforeEach(() => {
      hooks = new Hooks();
      const hook = (data, callback) => true;

      hooks.beforeAll(hook);
      hooks.beforeEach(hook);
      hooks.before('Transaction Name', hook);
      hooks.after('Transaction Name', hook);
      hooks.afterEach(hook);
      return hooks.afterAll(hook);
    });


    it('should return an object', () => assert.isObject(hooks.dumpHooksFunctionsToStrings()));

    return describe('returned object', () => {
      let properties = [
        'beforeAllHooks',
        'beforeEachHooks',
        'afterEachHooks',
        'afterAllHooks',
        'beforeEachValidationHooks'
      ];

      for (var property of properties) {
        (function (property) {
          it(`should have property '${property}'`, () => {
            const object = hooks.dumpHooksFunctionsToStrings();
            return assert.property(object, property);
          });

          it('should be an array', () => {
            const object = hooks.dumpHooksFunctionsToStrings();
            return assert.isArray(object[property]);
          });

          return describe(`all array members under property '${property}'`, () =>
            it('should be a string', () => {
              const object = hooks.dumpHooksFunctionsToStrings();
              return (() => {
                const result = [];
                for (const key in object[property]) {
                  const value = object[property][key];
                  result.push(((key, value) => assert.isString(value, `on ${property}['${key}']`))(key, value));
                }
                return result;
              })();
            })
          );
        }(property));
      }

      properties = [
        'beforeHooks',
        'afterHooks',
        'beforeValidationHooks'
      ];

      return (() => {
        const result = [];
        for (property of properties) {
          result.push((function (property) {
            it(`should have property '${property}'`, () => {
              const object = hooks.dumpHooksFunctionsToStrings();
              return assert.property(object, property);
            });

            it('should be an object', () => {
              const object = hooks.dumpHooksFunctionsToStrings();
              return assert.isObject(object[property]);
            });

            describe('each object value', () =>
              it('should be an array', () => {
                const object = hooks.dumpHooksFunctionsToStrings();
                return (() => {
                  const result1 = [];
                  for (const key in object[property]) {
                    const value = object[property][key];
                    result1.push(((key, value) => assert.isArray(object[property][key], `at hooks.dumpHooksFunctionsToStrings()[${property}][${key}]`))(key, value));
                  }
                  return result1;
                })();
              })
            );

            return describe('each member in that array', () =>
              it('should be a string', () => {
                const object = hooks.dumpHooksFunctionsToStrings();
                return (() => {
                  const result1 = [];
                  for (const transactionName in object[property]) {
                    const funcArray = object[property][transactionName];
                    result1.push(((transactionName, funcArray) =>
                      (() => {
                        const result2 = [];
                        for (const index in funcArray) {
                          const func = funcArray[index];
                          result2.push(assert.isString(object[property][transactionName][index], `at hooks.dumpHooksFunctionsToStrings()[${property}][${transactionName}][${index}]`));
                        }
                        return result2;
                      })()
                    )(transactionName, funcArray));
                  }
                  return result1;
                })();
              })
            );
          })(property));
        }
        return result;
      })();
    });
  });
});
