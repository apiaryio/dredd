fury = require('fury')
fury.use(require('fury-adapter-apib-parser'))
fury.use(require('fury-adapter-swagger'))


# Gets the first element that matches the element name by testing the element
# itself and traversing up through its ancestors in the tree. Works properly
# only after the element was made immutable by the 'freeze()' method.
#
# The name of the method is inspired by https://api.jquery.com/closest/
fury.minim.Element::closest = (elementName, className = null) ->
  element = @
  while element
    if element.element is elementName
      if className
        return element if element.classes.contains(className)
      else
        return element
    element = element.parent
  return null


parse = (source, callback) ->
  warningElement = null
  adapters = fury.detect(source)

  if adapters.length
    mediaType = adapters[0].mediaTypes[0]
  else
    mediaType = 'text/vnd.apiblueprint'
    warningElement = createWarning('''\
      Could not recognize API description format. \
      Falling back to API Blueprint by default.\
    ''')

  args = {source, mediaType, generateSourceMap: true}
  fury.parse(args, (err, apiElements) ->
    if not (err or apiElements)
      err = new Error('Unexpected parser error occurred.')
    else if err
      # Turning Fury error object into standard JavaScript error
      err = new Error(err.message)

    if apiElements
      apiElements.unshift(warningElement) if warningElement
      apiElements.freeze() # Adds 'parent' properties, prevents mutation
    else
      apiElements = null

    callback(err, {mediaType, apiElements})
  )


createWarning = (message) ->
  annotationElement = new fury.minim.elements.Annotation(message)
  annotationElement.classes.push('warning')
  return annotationElement


module.exports = parse
