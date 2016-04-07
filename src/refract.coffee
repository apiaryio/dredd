
sift = require('sift')
traverse = require('traverse')


match = (node, query) ->
  sifter = sift(query or {})
  sifter(node)


content = (node) ->
  return content(node.content) if node and node.content
  node


children = (node, query, options = {}) ->
  results = []
  sifter = sift(query or {})

  traverse(node).forEach((childNode) ->
    if childNode isnt node and childNode.element and sifter(childNode)
      results.push(childNode)
      @stop() if options.first
    return # needed for 'traverse' to work properly in CoffeeScript
  )
  results


child = (node, query, options = {}) ->
  options.first = true
  children(node, query, options)[0]


parents = (node, tree, query, options = {}) ->
  results = []
  sifter = sift(query or {})

  traversal = traverse(tree)
  traversal.forEach((childNode) ->
    # We look for given node to get information about it's location within
    # given tree. Then we process the node and stop the traversal.
    if childNode is node
      # 'traverse' provides '@path' in this function. '@path' is an array
      # of strings and it's a path to the currently processed element from the
      # tree of the traversal. E.g. ['content', '0', 'content', '0']
      #
      # Here we're cutting the @path into pieces like this:
      #
      # ['content']
      # ['content', '0']
      # ['content', '0', 'content']
      # ...
      #
      # This and 'traversal.get' gives us an ability to easily iterate over
      # all direct parents of the node.
      for pathSegmentIndex in [0...@path.length - 1].reverse()
        subPath = @path[0...pathSegmentIndex]
        parentNode = traversal.get(subPath)

        if parentNode.element and sifter(parentNode)
          results.push(parentNode)
          @stop() if options.first
      @stop()

    return # needed for 'traverse' to work properly in CoffeeScript
  )
  results


parent = (node, tree, query, options = {}) ->
  options.first = true
  parents(node, tree, query, options)[0]


module.exports = {match, content, children, child, parents, parent}
