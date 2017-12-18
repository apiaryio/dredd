// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
// Often, API description is arranged with a sequence of methods that lends
// itself to understanding by the human reading the documentation.
//
// However, the sequence of methods may not be appropriate for the machine
// reading the documentation in order to test the API.
//
// By sorting the transactions by their methods, it is possible to ensure that
// objects are created before they are read, updated, or deleted.
const sortTransactions = function(arr) {
  arr.map((a, i) => a['_index'] = i);

  arr.sort(function(a, b) {
    const sortedMethods = [
      "CONNECT", "OPTIONS",
      "POST", "GET", "HEAD", "PUT", "PATCH", "DELETE",
      "TRACE"
    ];
    const methodIndexA = sortedMethods.indexOf(a['request']['method']);
    const methodIndexB = sortedMethods.indexOf(b['request']['method']);

    switch (false) {
      case !(methodIndexA < methodIndexB): return -1;
      case !(methodIndexA > methodIndexB): return 1;
      case methodIndexA !== methodIndexB:
        return a['_index'] - b['_index'];
    }});

  arr.map(a => delete a['_index']);

  return arr;
};

module.exports = sortTransactions;

