// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
const hooksLog = require('./hooks-log');

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
    ({logs: this.logs, logger: this.logger} = options);
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
    return this.addHook(this.beforeHooks, name, hook);
  }

  beforeValidation(name, hook) {
    return this.addHook(this.beforeValidationHooks, name, hook);
  }

  after(name, hook) {
    return this.addHook(this.afterHooks, name, hook);
  }

  beforeAll(hook) {
    return this.beforeAllHooks.push(hook);
  }

  afterAll(hook) {
    return this.afterAllHooks.push(hook);
  }

  beforeEach(hook) {
    return this.beforeEachHooks.push(hook);
  }

  beforeEachValidation(hook) {
    return this.beforeEachValidationHooks.push(hook);
  }

  afterEach(hook) {
    return this.afterEachHooks.push(hook);
  }

  addHook(hooks, name, hook) {
    if (hooks[name]) {
      return hooks[name].push(hook);
    } else {
      return hooks[name] = [hook];
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
    // prepare JSON friendly object
    const toReturn = {};
    const names = [
      'beforeHooks',
      'beforeValidationHooks',
      'afterHooks',
      'beforeAllHooks',
      'afterAllHooks',
      'beforeEachHooks',
      'beforeEachValidationHooks',
      'afterEachHooks'
    ];

    for (let property of names) {
      var hookFunc, index;
      if (Array.isArray(this[property])) {
        toReturn[property] = [];
        for (index in this[property]) {
          hookFunc = this[property][index];
          toReturn[property][index] = hookFunc.toString();
        }

      } else if ((typeof(this[property]) === 'object') && !Array.isArray(this[property])) {
        toReturn[property] = {};
        for (let transactionName in this[property]) {
          const funcArray = this[property][transactionName];
          if (funcArray.length) {
            toReturn[property][transactionName] = [];
            for (index in funcArray) {
              hookFunc = funcArray[index];
              toReturn[property][transactionName][index] = hookFunc.toString();
            }
          }
        }
      }
    }

    return toReturn;
  }
}

module.exports = Hooks;
