{Pitboss} = require 'pitboss-ng'
Hooks = require './hooks'

sandboxHooksCode = (hooksCode, callback) ->
  hooks = new Hooks()
  wrappedCode = """
  var _hooks = new _Hooks();

  var before = _hooks.before;
  var after = _hooks.after;
  var beforeAll = _hooks.beforeAll;
  var afterAll = _hooks.afterAll;
  var beforeEach = _hooks.beforeEach;
  var afterEach = _hooks.afterEach;

  #{hooksCode}
  try {
    var output = _hooks.dumpHooksFunctionsToStrings()
  } catch(e) {
    console.log(e.message)
    console.log(e.stack)
    throw(e)
  }

  output
  """

  pitboss = new Pitboss(wrappedCode)
  pitboss.run {libraries: {"_Hooks": '../../../lib/hooks', "console", "console"}}, (err, result) ->
    pitboss.runner?.proc?.removeAllListeners 'exit'
    pitboss.runner?.kill?()
    return callback err if err
    callback(undefined, result)

module.exports = sandboxHooksCode
