clone = require 'clone'

mergeSandboxedHooks = (original, toMerge) ->

  newHooks = clone original

  for target, functions of toMerge
    if Array.isArray functions
      newHooks[target] = newHooks[target].concat functions
    else if typeof(functions) == "object" and not Array.isArray functions
      for transactionName, funcArray of functions
        newHooks[target][transactionName] ?= []
        newHooks[target][transactionName] = newHooks[target][transactionName].concat funcArray

  return newHooks

module.exports = mergeSandboxedHooks
