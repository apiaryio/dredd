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
function createRequestsResponsesIndex(transitionElement) {
  return transitionElement.transactions.map((transactionElement) => {
    const elements = [transactionElement.request, transactionElement.response];
    return elements.reduce((indexEntries, element) => {
      if (element.sourceMapValue) {
        indexEntries.push({
          position: Math.max.apply(
            null,
            element.sourceMapValue.reduce((positions, current) => positions.concat(current), [])
          ),
          transactionElement,
          type: element.element,
        });
      }
      return indexEntries;
    }, []);
  })
    .reduce((index, indexEntries) => index.concat(indexEntries), [])
    .sort((a, b) => a.position - b.position);
}

// Detects transaction example numbers for given transition element
//
// Returns an array of numbers, where indexes correspond to HTTP transactions
// within the transition and values represent the example numbers.
function detectTransactionExampleNumbers(transitionElement) {
  const requestsResponsesIndex = createRequestsResponsesIndex(transitionElement);
  const finalState = requestsResponsesIndex.reduce((previousState, indexEntry) => {
    const currentState = Object.assign({}, previousState);

    switch (indexEntry.type) {
      case 'httpRequest':
        if (currentState.previousType === 'httpResponse') currentState.currentNo += 1;
        currentState.previousType = 'httpRequest';
        break;
      case 'httpResponse':
        currentState.previousType = 'httpResponse';
        break;
      default:
        return currentState;
    }

    currentState.transactionIndex.set(indexEntry.transactionElement, currentState.currentNo);
    return currentState;
  }, {
    currentNo: 1,
    transactionIndex: new Map(),
    previousType: 'httpRequest',
  });
  return Array.from(finalState.transactionIndex.values());
}

module.exports = detectTransactionExampleNumbers;
