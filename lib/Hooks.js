const hooksLog = require('./hooksLog');

// READ THIS! Disclaimer:
// Do not add any functionality to this class unless you want to expose it to the Hooks API.
// This class is only an interface for users of Dredd hooks.

class Hooks {
  constructor(options = {}) {
    this.before = this.before.bind(this);
    this.beforeValidation = this.beforeValidation.bind(this);
    this.after = this.after.bind(this);
    this.beforeAll = this.beforeAll.bind(this);
    this.afterAll = this.afterAll.bind(this);
    this.beforeEach = this.beforeEach.bind(this);
    this.beforeEachValidation = this.beforeEachValidation.bind(this);
    this.afterEach = this.afterEach.bind(this);
    this.log = this.log.bind(this);
    this.dumpHooksFunctionsToStrings = this.dumpHooksFunctionsToStrings.bind(this);
    ({ logs: this.logs, logger: this.logger } = options);
    this.transactions = {};
    this.beforeHooks = {};
    this.beforeValidationHooks = {};
    this.afterHooks = {};
    this.beforeAllHooks = [];
    this.afterAllHooks = [];
    this.beforeEachHooks = [];
    this.beforeEachValidationHooks = [];
    this.afterEachHooks = [];
  }

  before(name, hook) {
    this.addHook(this.beforeHooks, name, hook);
  }

  beforeValidation(name, hook) {
    this.addHook(this.beforeValidationHooks, name, hook);
  }

  after(name, hook) {
    this.addHook(this.afterHooks, name, hook);
  }

  beforeAll(hook) {
    this.beforeAllHooks.push(hook);
  }

  afterAll(hook) {
    this.afterAllHooks.push(hook);
  }

  beforeEach(hook) {
    this.beforeEachHooks.push(hook);
  }

  beforeEachValidation(hook) {
    this.beforeEachValidationHooks.push(hook);
  }

  afterEach(hook) {
    this.afterEachHooks.push(hook);
  }

  addHook(hooks, name, hook) {
    if (hooks[name]) {
      hooks[name].push(hook);
    } else {
      hooks[name] = [hook];
    }
  }

  // log(logVariant, content)
  // log(content)
  log(...args) {
    this.logs = hooksLog(this.logs, this.logger, ...Array.from(args));
  }

  // This is not part of hooks API
  // This is here only because it has to be injected into sandboxed context
  dumpHooksFunctionsToStrings() {
    // Prepare JSON friendly object
    const toReturn = {};
    const names = [
      'beforeHooks',
      'beforeValidationHooks',
      'afterHooks',
      'beforeAllHooks',
      'afterAllHooks',
      'beforeEachHooks',
      'beforeEachValidationHooks',
      'afterEachHooks',
    ];

    for (const property of names) {
      let hookFunc;
      if (Array.isArray(this[property])) {
        toReturn[property] = [];
        Object.keys(this[property]).forEach((index) => {
          hookFunc = this[property][index];
          toReturn[property][index] = hookFunc.toString();
        });
      } else if (typeof this[property] === 'object' && !Array.isArray(this[property])) {
        toReturn[property] = {};
        Object.keys(this[property]).forEach((transactionName) => {
          const funcArray = this[property][transactionName];
          if (funcArray.length) {
            toReturn[property][transactionName] = [];
            Object.keys(funcArray).forEach((index) => {
              hookFunc = funcArray[index];
              toReturn[property][transactionName][index] = hookFunc.toString();
            });
          }
        });
      }
    }

    return toReturn;
  }
}

module.exports = Hooks;
