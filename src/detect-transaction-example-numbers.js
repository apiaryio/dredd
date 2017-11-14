// Detects transaction example numbers for given transition element
//
// Returns an array of numbers, where indexes correspond to HTTP transactions
// within the transition and values represent the example numbers.
const detectTransactionExampleNumbers = function(transitionElement) {
  const requestsResponsesIndex = createRequestsResponsesIndex(transitionElement);
  const finalState = requestsResponsesIndex.reduce(function(state, indexEntry) {
    switch (indexEntry.type) {
      case 'httpRequest':
        (state.previousType === 'httpResponse') && (state.currentNo += 1);
        state.previousType = 'httpRequest';
        break;
      case 'httpResponse':
        state.previousType = 'httpResponse';
        break;
    }

    state.transactionIndex.set(indexEntry.transactionElement, state.currentNo);
    return state;
  }
  , {
    currentNo: 1,
    transactionIndex: new Map(),
    previousType: 'httpRequest'
  });
  return Array.from(finalState.transactionIndex.values());
};


// Provides index of requests and responses within given *transition*, sorted by
// their position in the original API Blueprint document (from first to last).
//
//     [
//         {
//             'type': 'httpResponse',
//             'transaction': fury.minim.elements.HttpTransaction()
//             'position': 85,
//         },
//         ...
//     ]
//
// ## Index Entry (object)
//
// - type: httpRequest, httpResponse (enum)
// - position (number) - Position of the first character relevant to
//   the request (or response) within the original API Blueprint document.
var createRequestsResponsesIndex = transitionElement =>
  transitionElement.transactions.map(function(transactionElement) {
    const elements = [transactionElement.request, transactionElement.response];
    return elements.reduce(function(indexEntries, element) {
      if (element.sourceMapValue) {
        indexEntries.push({
          position: Math.max.apply(
            null,
            element.sourceMapValue.reduce((positions, current) => positions.concat(current)
            , [])
          ),
          transactionElement,
          type: element.element
        });
      }
      return indexEntries;
    }
    , []);
  })
  .reduce((index, indexEntries) => index.concat(indexEntries)
  , [])
  .sort((a, b) => a.position - b.position)
;


module.exports = detectTransactionExampleNumbers;
