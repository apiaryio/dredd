# Often, API documentation is arranged with a sequence of methods that lends
# itself to understanding by the human reading the documentation.
#
# However, the sequence of methods may not be appropriate for the machine
# reading the documentation in order to test the API.
#
# By sorting the transactions by their methods, it is possible to ensure that
# objects are created before they are read, updated, or deleted.
sortTransactions = (arr) ->
  arr.map (a, i) ->
    a['_index'] = i

  arr.sort (a, b) ->
    sortedMethods = [
      "CONNECT", "OPTIONS",
      "POST", "GET", "HEAD", "PUT", "PATCH", "DELETE",
      "TRACE"
    ]
    methodIndexA = sortedMethods.indexOf(a['request']['method'])
    methodIndexB = sortedMethods.indexOf(b['request']['method'])

    return switch
      when methodIndexA < methodIndexB then -1
      when methodIndexA > methodIndexB then 1
      when methodIndexA == methodIndexB
        a['_index'] - b['_index']

  arr.map (a) ->
    delete a['_index']

  arr

module.exports = sortTransactions

