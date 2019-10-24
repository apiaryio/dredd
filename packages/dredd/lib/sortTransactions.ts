import { HTTPMethod, Transaction } from './general';

const sortedMethods: HTTPMethod[] = [
  HTTPMethod.CONNECT,
  HTTPMethod.OPTIONS,
  HTTPMethod.POST,
  HTTPMethod.GET,
  HTTPMethod.HEAD,
  HTTPMethod.PUT,
  HTTPMethod.PATCH,
  HTTPMethod.LINK,
  HTTPMethod.UNLINK,
  HTTPMethod.DELETE,
  HTTPMethod.TRACE,
];

// Often, API description is arranged with a sequence of methods that lends
// itself to understanding by the human reading the documentation.
//
// However, the sequence of methods may not be appropriate for the machine
// reading the documentation in order to test the API.
//
// By sorting the transactions by their methods, it is possible to ensure that
// objects are created before they are read, updated, or deleted.
export default function sortTransactions(
  transactions: Transaction[],
): Transaction[] {
  // Convert the list of transactions into a list of tuples
  // that hold each trasnaction index and details.
  const tempTransactions: Array<[number, Transaction]> = transactions.map(
    (transaction, index) => [index, transaction],
  );

  tempTransactions.sort(
    ([leftIndex, leftTransaction], [rightIndex, rightTransaction]) => {
      const methodIndexA = sortedMethods.indexOf(
        leftTransaction.request.method,
      );
      const methodIndexB = sortedMethods.indexOf(
        rightTransaction.request.method,
      );

      // Sort transactions according to the transaction's request method
      if (methodIndexA < methodIndexB) {
        return -1;
      }

      if (methodIndexA > methodIndexB) {
        return 1;
      }

      // In case two transactions' request methods are the same,
      // preserve the original order of those transactions
      return leftIndex - rightIndex;
    },
  );

  const cleanTransactions = tempTransactions.map(
    ([_, transaction]) => transaction,
  );

  return cleanTransactions;
}
