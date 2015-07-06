blueprintAstToRuntime = require './blueprint-ast-to-runtime'
transactionName = require './transaction-name'
module.exports =
  compile: (ast, filename) ->
    result = blueprintAstToRuntime ast, filename

    for transaction in result['transactions']
      transaction['name'] = transactionName transaction

    result