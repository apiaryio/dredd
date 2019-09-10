import { RESTMethod, Transaction } from './__general'

// Often, API description is arranged with a sequence of methods that lends
// itself to understanding by the human reading the documentation.
//
// However, the sequence of methods may not be appropriate for the machine
// reading the documentation in order to test the API.
//
// By sorting the transactions by their methods, it is possible to ensure that
// objects are created before they are read, updated, or deleted.
export default function sortTransactions(transactions: Transaction[]) {
  transactions.forEach((a, i) => {
    ;(a as any)._index = i
  })

  transactions.sort((leftTransaction, rightTransaction) => {
    const sortedMethods: RESTMethod[] = [
      RESTMethod.CONNECT,
      RESTMethod.OPTIONS,
      RESTMethod.POST,
      RESTMethod.GET,
      RESTMethod.HEAD,
      RESTMethod.PUT,
      RESTMethod.PATCH,
      RESTMethod.DELETE,
      RESTMethod.TRACE
    ]

    const methodIndexA = sortedMethods.indexOf(leftTransaction.request.method)
    const methodIndexB = sortedMethods.indexOf(rightTransaction.request.method)

    if (methodIndexA < methodIndexB) {
      return -1
    }

    if (methodIndexA > methodIndexB) {
      return 1
    }

    return (leftTransaction as any)._index - (rightTransaction as any)._index
  })

  transactions.forEach((a) => delete (a as any)._index)

  return transactions
}
