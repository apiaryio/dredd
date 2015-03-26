async = require 'async'

# Do not add any functinoality to this class unless you want expose it to the Hooks
# This class is only an interface for users of Dredd hooks.

class Hooks
  constructor: ->
    @beforeHooks = {}
    @afterHooks = {}
    @transactions = {}
    @beforeAllHooks = []
    @afterAllHooks = []
    @beforeEachHooks = []
    @afterEachHooks = []

  before: (name, hook) =>
    @addHook(@beforeHooks, name, hook)

  after: (name, hook) =>
    @addHook(@afterHooks, name, hook)

  beforeAll: (hook) =>
    @beforeAllHooks.push hook

  afterAll: (hook) =>
    @afterAllHooks.push hook

  beforeEach: (hook) =>
    @beforeEachHooks.push hook

  afterEach: (hook) =>
    @afterEachHooks.push hook

  addHook: (hooks, name, hook) ->
    if hooks[name]
      hooks[name].push hook
    else
      hooks[name] = [hook]

module.exports = Hooks
