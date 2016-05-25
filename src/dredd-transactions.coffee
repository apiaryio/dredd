
parse = require('./parse')
compileFromApiElements = require('./compile')
getTransactionName = require('./transaction-name/get-transaction-name')
getTransactionPath = require('./transaction-path/get-transaction-path')


compile = (input, filename, callback) ->
  # All regular parser-related or compilation-related errors and warnings
  # should be returned in the "compilation result". Callback should get
  # an error only in case of unexpected crash.

  parse(input, (err, apiElements) ->
    # If 'apiElements' isn't empty, then we don't need to care about 'err'
    # as it should be represented by annotation inside 'apiElements'
    # and compilation should be able to deal with it and propagate it.
    if err and not apiElements
      compilationResult = {transactions: [], warnings: [], errors: [
        component: 'apiDescriptionParser'
        message: err.message
      ]}
      return callback(null, compilationResult)

    # The try/catch is just to deal with unexpected crash. Compilation passes
    # all errors as part of the 'result' and it should not throw anything
    # in any case.
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
