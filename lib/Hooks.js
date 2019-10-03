import hooksLog from './hooksLog';

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
    this.logs = options.logs;
    this.logger = options.logger;
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
}

export default Hooks;
