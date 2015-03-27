clone = require 'clone'

mergeSendboxedHooks = (original, toMerge) ->
  newHooks = clone original
  console.log newHooks
  return newHooks

module.exports = mergeSendboxedHooks