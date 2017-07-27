# Provides index of requests and responses within given *transition*, sorted by
# their position in the original API Blueprint document (from first to last).
#
#     [
#         {
#             'type': 'httpResponse',
#             'transaction': {'element': 'httpTransaction', ...},
#             'position': 85,
#         },
#         ...
#     ]
#
# ## Index Entry (object)
#
# - type: httpRequest, httpResponse (enum)
# - transaction (object) - Parent transaction element.
# - position (number) - Position of the first character relevant to
#   the request (or response) within the original API Blueprint document.
createIndex = (transition) ->
  transition.transactions.map((transaction) ->
    [transaction.request, transaction.response].reduce((elements, element) ->
      elements.push({
        position: Math.max.apply(
          null,
          element.sourceMapValue.reduce((positions, current) ->
            positions.concat(current)
          , [])
        ),
        transaction: transaction,
        type: element.element
      }) if element.sourceMapValue
      elements
    , [])
  )
  .reduce((index, elements) ->
    index.concat(elements)
  , [])
  .sort((a, b) -> a.position - b.position)

# Detects transaction example numbers for given transition element
#
# Returns an array of numbers, where indexes correspond to HTTP transactions
# within the transition and values represent the example numbers.
detectTransactionExampleNumbers = (transition) ->
  exampleNumbers = createIndex(transition).reduce((state, element, idx, array) ->
    switch element.type
      when 'httpRequest'
        state.previousType is 'httpResponse' and state.currentNumber += 1
        state.previousType = 'httpRequest'
      when 'httpResponse'
        state.previousType = 'httpResponse'

    state.transactionIndex.set(element.transaction, state.currentNumber)
    return state
  , {
    currentNumber: 1,
    transactionIndex: new Map(),
    previousType: 'httpRequest'
  })

  Array.from(exampleNumbers.transactionIndex.values())

module.exports = detectTransactionExampleNumbers
