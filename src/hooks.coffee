async = require 'async'

class Hooks
  constructor: () ->
    @beforeHooks = {}
    @afterHooks = {}
    @transactions = {}
    @beforeAllHooks = []
    @afterAllHooks = []

  before: (name, hook) =>
    @addHook(@beforeHooks, name, hook)

  after: (name, hook) =>
    @addHook(@afterHooks, name, hook)

  beforeAll: (hook) =>
    @beforeAllHooks.push hook

  afterAll: (hook) =>
    @afterAllHooks.push hook

  addHook: (hooks, name, hook) =>
    if hooks[name]
      hooks[name].push hook
    else
      hooks[name] = [hook]

  runBeforeAll: (callback) =>
    async.series @beforeAllHooks, callback

  runAfterAll: (callback) =>
    async.series @afterAllHooks, callback

module.exports = new Hooks()
