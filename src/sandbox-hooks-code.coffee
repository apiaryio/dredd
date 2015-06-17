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
  var beforeValidation = _hooks.beforeValidation;
  var beforeEachValidation = _hooks.beforeEachValidation;

  var log = _hooks.log;

  #{hooksCode}
  try {
    var output = _hooks.dumpHooksFunctionsToStrings();
  } catch(e) {
    console.log(e.message);
    console.log(e.stack);
    throw(e);
  }

  output
  """

  sandbox = new Pitboss(wrappedCode)
  sandbox.run {libraries: {'_Hooks': '../../../lib/hooks', 'console'}}, (err, result) ->
    sandbox.kill()
    return callback err if err
    callback(undefined, result)
    return
  return

module.exports = sandboxHooksCode
