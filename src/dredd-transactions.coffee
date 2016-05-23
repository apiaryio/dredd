
parse = require('./parse')
compileFromApiElements = require('./compile')
getTransactionName = require('./transaction-name/get-transaction-name')
getTransactionPath = require('./transaction-path/get-transaction-path')


compile = (input, filename, callback) ->
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


module.exports = {compile}
