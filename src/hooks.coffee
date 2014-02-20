
class Hooks
  constructor: () ->
    @beforeHooks = {}
    @afterHooks = {}

  before: (name, hook) ->
    @beforeHooks[name] = hook

  after: (name, hook) ->
    @afterHooks[name] = hook

module.exports = new Hooks()
