# Provides index of requests and responses within given *transition*, sorted by
# their position in the original API Blueprint document (from first to last).
#
#     [
#         {
#             'type': 'httpResponse',
#             'transaction': fury.minim.elements.HttpTransaction()
#             'position': 85,
#         },
#         ...
#     ]
#
# ## Index Entry (object)
#
# - type: httpRequest, httpResponse (enum)
# - position (number) - Position of the first character relevant to
#   the request (or response) within the original API Blueprint document.
createRequestsResponsesIndex = (transitionElement) ->
  transitionElement.transactions.map((transactionElement) ->
    elements = [transactionElement.request, transactionElement.response]
    elements.reduce((indexEntries, element) ->
      if element.sourceMapValue
        indexEntries.push({
          position: Math.max.apply(
            null,
            element.sourceMapValue.reduce((positions, current) ->
              positions.concat(current)
            , [])
          ),
          transactionElement: transactionElement,
          type: element.element
        })
      return indexEntries
    , [])
  )
  .reduce((index, indexEntries) ->
    index.concat(indexEntries)
  , [])
  .sort((a, b) -> a.position - b.position)


# Detects transaction example numbers for given transition element
#
# Returns an array of numbers, where indexes correspond to HTTP transactions
# within the transition and values represent the example numbers.
detectTransactionExampleNumbers = (transitionElement) ->
  requestsResponsesIndex = createRequestsResponsesIndex(transitionElement)
  finalState = requestsResponsesIndex.reduce((state, indexEntry) ->
    switch indexEntry.type
      when 'httpRequest'
        state.previousType is 'httpResponse' and state.currentNo += 1
        state.previousType = 'httpRequest'
      when 'httpResponse'
        state.previousType = 'httpResponse'

    state.transactionIndex.set(indexEntry.transactionElement, state.currentNo)
    return state
  , {
    currentNo: 1,
    transactionIndex: new Map(),
    previousType: 'httpRequest'
  })
  return Array.from(finalState.transactionIndex.values())


module.exports = detectTransactionExampleNumbers
