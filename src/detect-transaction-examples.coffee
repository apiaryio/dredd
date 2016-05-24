
traverse = require('traverse')


detectTransactionExamples = (transition) ->
  # Index of requests and responses within given *transition*, sorted by
  # their position in the original API Blueprint document.
  index = createIndex(transition)

  # No transaction examples, handling as a special case.
  if not index.length
    transition.attributes ?= {}
    transition.attributes.examples = 0
    return

  # Iterating over requests and responses in the index, keeping track of in
  # which block we currently are (block of requests: 'req', block
  # of responses: 'res'). In case there's change 'res' -> 'req', we raise
  # the example number. The example number is then attached to every
  # transaction as a Refract attribute 'example'. The total number of examples
  # gets attached to the transition as a Refract attribute 'examples'.
  example = 1
  state = 'req'

  for {type, transaction} in index
    if type is 'httpRequest'
      example += 1 if state is 'res'
      state = 'req'
    else # 'httpResponse'
      state = 'res'

    transaction.attributes ?= {}
    transaction.attributes.example = example

  transition.attributes ?= {}
  transition.attributes.examples = example

  return # 'in situ' function


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
  mapping = {}

  traversal = traverse(transition)
  traversal.forEach((node) ->
    # Process just sourceMap elements.
    return unless node?.element is 'sourceMap'

    # Ignore sourceMap elements for request's HTTP method. Method is
    # often on a different place in the document than the actual
    # request is, so it's sourceMap is misleading for our purpose.
    return if 'method' in @path

    # Iterate over parents of the source map element and find
    # corresponding request (or response) and transaction elements.
    #
    # Key is a string representing one request or response in the index.
    # It is a path of the request (or response), concatenated by dots.
    key = null
    entry = {}

    for i in [0..@path.length]
      path = @path[0..i]
      parentNode = traversal.get(path)
      switch parentNode.element
        when 'httpRequest', 'httpResponse'
          key = path.join('.')
          entry.type = parentNode.element
        when 'httpTransaction'
          entry.transaction = parentNode

    # Process just sourceMap elements inside requests and responses.
    #
    # If we were not able to determine all necessary information (e.g. because
    # given source map isn't inside request or response, but somewhere else
    # in the transition's Refract tree), ignore the node.
    return unless key and entry.type and entry.transaction

    # Take positions of the first character for each continuous code block
    # in the source map.
    #
    # At the end we'll take the lowest number from the array as
    # a representation of the beginning of the whole request (or response)
    # within the original document.
    positions = (charBlock[0] for charBlock in node.content)

    if mapping[key]
      # If entry for given request (or response) already exists, add
      # also its current position to the array. This allows us to take the
      # lowest number among all source maps for given request (or response).
      positions.push(mapping[key].position)
    else
      # If the entry isn't in the mapping yet, create a new one.
      mapping[key] ?= entry

    # Now set the lowest position from all positions found for
    # the request (or response). This way at the end of this traversal
    # the 'position' attribute should contain position of the first
    # character relevant for the whole request (or response).
    mapping[key].position = Math.min.apply(null, positions)

    return # needed for 'traverse' to work properly in CoffeeScript
  )

  # Turn the mapping into an index, i.e. an array sorted by position.
  index = (entry for own key, entry of mapping)
  index.sort((entry1, entry2) -> entry1.position - entry2.position)
  return index


module.exports = detectTransactionExamples
