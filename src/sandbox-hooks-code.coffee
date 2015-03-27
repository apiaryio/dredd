{Pitboss} = require 'pitboss'
Hooks = require './hooks'

sandboxHooksCode = (hooksCode, callback) ->
  hooks = new Hooks
  wrappedCode = """
  var _hooks = new _Hooks();

  var before = _hooks.before;
  var after = _hooks.after;
  var beforeAll = _hooks.beforeAll;
  var afterAll = _hooks.afterAll;
  var beforeEach = _hooks.beforeEach;
  var afterEach = _hooks.afterEach;

  #{hooksCode}

  var output = _hooks.dumpHooksFunctionsToStrings()
  output
  """

  pitboss = new Pitboss wrappedCode
  pitboss.run {libraries: {"_Hooks": '../../../lib/hooks'}}, (err, result) ->
    return callback err if err
    callback(undefined, result)

module.exports = sandboxHooksCode