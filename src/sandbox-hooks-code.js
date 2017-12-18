// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
const {Pitboss} = require('pitboss-ng');
const Hooks = require('./hooks');

const sandboxHooksCode = function(hooksCode, callback) {
  const hooks = new Hooks();
  const wrappedCode = `\
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

${hooksCode}
try {
  var output = _hooks.dumpHooksFunctionsToStrings();
} catch(e) {
  console.log(e.message);
  console.log(e.stack);
  throw(e);
}

output\
`;

  const sandbox = new Pitboss(wrappedCode);
  sandbox.run({libraries: {'_Hooks': '../../../lib/hooks', 'console': 'console'}}, function(err, result) {
    sandbox.kill();
    if (err) { return callback(err); }
    callback(undefined, result);
  });
};

module.exports = sandboxHooksCode;
