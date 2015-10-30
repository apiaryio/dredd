blueprintAstToRuntime = require './blueprint-ast-to-runtime'
getTransactionName = require './get-transaction-name'
getTransactionPath = require './get-transaction-path'

module.exports =

  # TO BE DEPRECATED: filename
  # filename is used only for compiling to human readeable name in reporters
  # and this logic will be moved to Dredd reporters
  compile: (ast, filename) ->
    addNames =  () =>
      for transaction in @result['transactions']
        transaction['name'] = getTransactionName transaction

    addPaths = () =>
      for transaction in @result['transactions']
        transaction['path'] = getTransactionPath transaction

    @result = blueprintAstToRuntime ast, filename

    addNames()
    addPaths()

    @result
