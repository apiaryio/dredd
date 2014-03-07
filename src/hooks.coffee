
class Hooks
  constructor: () ->
    @beforeHooks = {}
    @afterHooks = {}
    @transactions = {}

  before: (name, hook) =>
    @addHook(@beforeHooks, name, hook)

  after: (name, hook) =>
    @addHook(@afterHooks, name, hook)

  addHook: (hooks, name, hook) =>
    if hooks[name]
      hooks[name].push hook
    else
      hooks[name] = [hook]

module.exports = new Hooks()
