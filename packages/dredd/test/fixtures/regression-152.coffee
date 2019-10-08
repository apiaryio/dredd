hooks = require 'hooks'

# New hooks helper function
hooks.beforeEach = (hookFn) ->
  hooks.beforeAll (done) ->
    for transactionKey, transaction of hooks.transactions or {}
      hooks.beforeHooks[transaction.name] ?= []
      hooks.beforeHooks[transaction.name].unshift hookFn
    done()

hooks.beforeEach (transaction) ->
  # add query parameter to each transaction here
  paramToAdd = "api-key=23456"
  if transaction.fullPath.indexOf('?') > -1
    transaction.fullPath += "&" + paramToAdd
  else
    transaction.fullPath += "?" + paramToAdd
