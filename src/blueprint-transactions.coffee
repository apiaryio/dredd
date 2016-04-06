
{parse} = require('./parse')
blueprintAstToRuntime = require('./blueprint-ast-to-runtime')
getTransactionName = require('./get-transaction-name')
getTransactionPath = require('./get-transaction-path')


compile = (input, filename, callback) ->
  # Beware! The 'filename' argument is going to be removed soon:
  # https://github.com/apiaryio/dredd-transactions/issues/6

  if typeof input is 'string'
    # input is API description document
    parse(input, (err, apiElements) ->
      callback(err or new Error('Not implemented yet!'))
    )
  else
    # input is API Blueprint AST (kept just for backwards compatibility!)
    result = blueprintAstToRuntime(input, filename)
    for transaction in result.transactions
      transaction['name'] = getTransactionName(transaction)
      transaction['path'] = getTransactionPath(transaction)
    callback(null, result)


module.exports = {compile}
