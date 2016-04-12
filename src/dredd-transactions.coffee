
{parse} = require('./parse')
{compileFromApiBlueprintAst} = require('./from-api-blueprint-ast/compile')
{compileFromApiElements} = require('./from-api-elements/compile')
getTransactionName = require('./transaction-name/get-transaction-name')
getTransactionPath = require('./transaction-path/get-transaction-path')


compile = (input, filename, callback) ->
  # Beware! The 'filename' argument is going to be removed soon:
  # https://github.com/apiaryio/dredd-transactions/issues/6

  if typeof input is 'string'
    # input is API description document
    parse(input, (err, apiElements) ->
      try
        result = compileFromApiElements(apiElements, filename)
      catch err
        return callback(err)

      for transaction in result.transactions
        transaction['name'] = getTransactionName(transaction)
        transaction['path'] = getTransactionPath(transaction)
      callback(null, result)
    )
  else
    # input is API Blueprint AST (kept just for backwards compatibility!)
    result = compileFromApiBlueprintAst(input, filename)
    for transaction in result.transactions
      transaction['name'] = getTransactionName(transaction)
      transaction['path'] = getTransactionPath(transaction)
    callback(null, result)


module.exports = {compile}
