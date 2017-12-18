// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
const clone = require('clone');

const mergeSandboxedHooks = function(original, toMerge) {

  const newHooks = clone(original);

  for (let target in toMerge) {
    const functions = toMerge[target];
    if (Array.isArray(functions)) {
      newHooks[target] = newHooks[target].concat(functions);
    } else if ((typeof(functions) === "object") && !Array.isArray(functions)) {
      for (let transactionName in functions) {
        const funcArray = functions[transactionName];
        if (newHooks[target][transactionName] == null) { newHooks[target][transactionName] = []; }
        newHooks[target][transactionName] = newHooks[target][transactionName].concat(funcArray);
      }
    }
  }

  return newHooks;
};

module.exports = mergeSandboxedHooks;
