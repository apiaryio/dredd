// Often, API description is arranged with a sequence of methods that lends
// itself to understanding by the human reading the documentation.
//
// However, the sequence of methods may not be appropriate for the machine
// reading the documentation in order to test the API.
//
// By sorting the transactions by their methods, it is possible to ensure that
// objects are created before they are read, updated, or deleted.
module.exports = function sortTransactions(arr) {
  arr.forEach((a, i) => { a._index = i; });

  arr.sort((a, b) => {
    const sortedMethods = [
      'CONNECT', 'OPTIONS',
      'POST', 'GET', 'HEAD', 'PUT', 'PATCH', 'DELETE',
      'TRACE',
    ];

    const methodIndexA = sortedMethods.indexOf(a.request.method);
    const methodIndexB = sortedMethods.indexOf(b.request.method);

    if (methodIndexA < methodIndexB) { return -1; }
    if (methodIndexA > methodIndexB) { return 1; }
    return a._index - b._index;
  });

  arr.forEach(a => delete a._index);

  return arr;
};
