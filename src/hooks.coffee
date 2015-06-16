hooksLog = require './hooks-log'

# READ THIS! Disclaimer:
# Do not add any functionality to this class unless you want to expose it to the Hooks API.
# This class is only an interface for users of Dredd hooks.

class Hooks
  constructor: (options = {}) ->
    {@logs, @logger} = options
    @transactions = {}
    @beforeHooks = {}
    @beforeValidationHooks = {}
    @afterHooks = {}
    @beforeAllHooks = []
    @afterAllHooks = []
    @beforeEachHooks = []
    @beforeEachValidationHooks = []
    @afterEachHooks = []

  before: (name, hook) =>
    @addHook(@beforeHooks, name, hook)

  beforeValidation: (name, hook) =>
    @addHook(@beforeValidationHooks, name, hook)

  after: (name, hook) =>
    @addHook(@afterHooks, name, hook)

  beforeAll: (hook) =>
    @beforeAllHooks.push hook

  afterAll: (hook) =>
    @afterAllHooks.push hook

  beforeEach: (hook) =>
    @beforeEachHooks.push hook

  beforeEachValidation: (hook) =>
    @beforeEachValidationHooks.push hook

  afterEach: (hook) =>
    @afterEachHooks.push hook

  addHook: (hooks, name, hook) ->
    if hooks[name]
      hooks[name].push hook
    else
      hooks[name] = [hook]

  # log(logVariant, content)
  # log(content)
  log: (args...) =>
    @logs = hooksLog @logs, @logger, args...
    return

  # This is not part of hooks API
  # This is here only because it has to be injected into sandboxed context
  dumpHooksFunctionsToStrings: =>
    # prepare JSON friendly object
    toReturn = {}
    names = [
      'beforeHooks'
      'beforeValidationHooks'
      'afterHooks'
      'beforeAllHooks'
      'afterAllHooks'
      'beforeEachHooks'
      'beforeEachValidationHooks'
      'afterEachHooks'
    ]

    for property in names
      if Array.isArray @[property]
        toReturn[property] = []
        for index, hookFunc of @[property]
          toReturn[property][index] = hookFunc.toString()

      else if typeof(@[property]) is 'object' and not Array.isArray(@[property])
        toReturn[property] = {}
        for transactionName, funcArray of @[property] when funcArray.length
          toReturn[property][transactionName] = []
          for index, hookFunc of funcArray
            toReturn[property][transactionName][index] = hookFunc.toString()

    return toReturn

module.exports = Hooks
