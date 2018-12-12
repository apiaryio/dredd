const sinon = require('sinon');
const { assert } = require('chai');

const Hooks = require('../../src/Hooks');

describe('Hooks', () => {
  describe('constructor', () => {
    it('should not add @logs or @logger when constructor options are empty', () => {
      const hooks = new Hooks();
      assert.isUndefined(hooks.logs);
      assert.isUndefined(hooks.logger);
    });

    it('should add @logs and @logger from passed options', () => {
      const options = {
        logs: [{ content: 'message1' }, { content: 'message2' }],
        logger: {
          hook() {},
          error() {}
        }
      };

      const hooks = new Hooks(options);
      assert.strictEqual(hooks.logs, options.logs);
      assert.strictEqual(hooks.logger, options.logger);
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
      sinon.spy(options.logger, 'error');
    });

    afterEach(() => {
      options.logger.hook.restore();
      options.logger.error.restore();
    });

    it('should call @logger.hook when hooks.log is called with 1 argument', () => {
      const hooks = new Hooks(options);
      hooks.log('messageX');
      assert.isTrue(options.logger.hook.called);
      assert.isFalse(options.logger.error.called);
      assert.property(hooks.logs[2], 'timestamp');
      assert.propertyVal(hooks.logs[0], 'content', 'message1');
      assert.propertyVal(hooks.logs[1], 'content', 'message2');
      assert.propertyVal(hooks.logs[2], 'content', 'messageX');
    });
  });

  describe('#before', () => {
    let hooks;

    before(() => {
      hooks = new Hooks();
      hooks.before('beforeHook', () => '');
    });

    it('should add to hook collection', () => assert.property(hooks.beforeHooks, 'beforeHook'));
  });

  describe('#beforeValidation', () => {
    let hooks;

    before(() => {
      hooks = new Hooks();
      hooks.beforeValidation('beforeValidationHook', () => '');
    });

    it('should add to hook collection', () => assert.property(hooks.beforeValidationHooks, 'beforeValidationHook'));
  });

  describe('#after', () => {
    let hooks;

    before(() => {
      hooks = new Hooks();
      hooks.after('afterHook', () => '');
    });

    it('should add to hook collection', () => assert.property(hooks.afterHooks, 'afterHook'));
  });

  describe('#beforeAll', () => {
    let hooks;

    before(() => {
      hooks = new Hooks();
      hooks.beforeAll(() => '');
    });

    it('should add to hook collection', () => assert.lengthOf(hooks.beforeAllHooks, 1));
  });

  describe('#afterAll', () => {
    let hooks;

    before(() => {
      hooks = new Hooks();
      hooks.afterAll(() => '');
    });

    it('should add to hook collection', () => assert.lengthOf(hooks.afterAllHooks, 1));
  });

  describe('#beforeEach', () => {
    let hooks;

    before(() => {
      hooks = new Hooks();
      hooks.beforeEach(() => '');
    });

    it('should add to hook collection', () => assert.lengthOf(hooks.beforeEachHooks, 1));
  });

  describe('#beforeEachValidation', () => {
    let hooks;

    before(() => {
      hooks = new Hooks();
      hooks.beforeEachValidation(() => '');
    });

    it('should add to hook collection', () => assert.lengthOf(hooks.beforeEachValidationHooks, 1));
  });


  describe('#afterEach', () => {
    let hooks;

    before(() => {
      hooks = new Hooks();
      hooks.afterEach(() => '');
    });

    it('should add to hook collection', () => assert.lengthOf(hooks.afterEachHooks, 1));
  });

  describe('#dumpHooksFunctionsToStrings', () => {
    let hooks;

    beforeEach(() => {
      hooks = new Hooks();
      const hook = () => true;

      hooks.beforeAll(hook);
      hooks.beforeEach(hook);
      hooks.before('Transaction Name', hook);
      hooks.after('Transaction Name', hook);
      hooks.afterEach(hook);
      hooks.afterAll(hook);
    });

    it('should return an object', () => assert.isObject(hooks.dumpHooksFunctionsToStrings()));

    describe('returned object', () => {
      let properties = [
        'beforeAllHooks',
        'beforeEachHooks',
        'afterEachHooks',
        'afterAllHooks',
        'beforeEachValidationHooks'
      ];

      properties.forEach((property) => {
        it(`should have property '${property}'`, () => {
          const object = hooks.dumpHooksFunctionsToStrings();
          assert.property(object, property);
        });

        it('should be an array', () => {
          const object = hooks.dumpHooksFunctionsToStrings();
          assert.isArray(object[property]);
        });

        describe(`all array members under property '${property}'`, () =>
          it('should be a string', () => {
            const object = hooks.dumpHooksFunctionsToStrings();
            Object.keys(object[property]).forEach((key) => {
              const value = object[property][key];
              assert.isString(value, `on ${property}['${key}']`);
            });
          })
        );
      });

      properties = [
        'beforeHooks',
        'afterHooks',
        'beforeValidationHooks'
      ];

      properties.forEach((property) => {
        it(`should have property '${property}'`, () => {
          const object = hooks.dumpHooksFunctionsToStrings();
          assert.property(object, property);
        });

        it('should be an object', () => {
          const object = hooks.dumpHooksFunctionsToStrings();
          assert.isObject(object[property]);
        });

        describe('each object value', () => {
          it('should be an array', () => {
            const object = hooks.dumpHooksFunctionsToStrings();
            Object.keys(object[property]).forEach((key) => {
              assert.isArray(object[property][key], `at hooks.dumpHooksFunctionsToStrings()[${property}][${key}]`);
            });
          });
        });

        describe('each member in that array', () => {
          it('should be a string', () => {
            const object = hooks.dumpHooksFunctionsToStrings();
            Object.keys(object[property]).forEach((transactionName) => {
              const funcArray = object[property][transactionName];
              funcArray.forEach((func, index) => {
                assert.isString(object[property][transactionName][index], `at hooks.dumpHooksFunctionsToStrings()[${property}][${transactionName}][${index}]`);
              });
            });
          });
        });
      });
    });
  });
});
