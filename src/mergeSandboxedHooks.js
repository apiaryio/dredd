const clone = require('clone');

module.exports = function mergeSandboxedHooks(original, toMerge) {
  const newHooks = clone(original);

  Object.keys(toMerge).forEach((target) => {
    const functions = toMerge[target];
    if (Array.isArray(functions)) {
      newHooks[target] = newHooks[target].concat(functions);
    } else if (typeof functions === 'object' && !Array.isArray(functions)) {
      Object.keys(functions).forEach((transactionName) => {
        const funcArray = functions[transactionName];
        if (!newHooks[target][transactionName]) { newHooks[target][transactionName] = []; }
        newHooks[target][transactionName] = newHooks[target][transactionName].concat(funcArray);
      });
    }
  });

  return newHooks;
};
