fury = require('fury')
fury.use(require('fury-adapter-apib-parser'))
fury.use(require('fury-adapter-swagger'))


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
    else
      apiElements = null

    callback(err, {mediaType, apiElements})
  )


createWarning = (message) ->
  annotationElement = new fury.minim.elements.Annotation(message)
  annotationElement.classes.push('warning')
  annotationElement.attributes.set('sourceMap', [
    new fury.minim.elements.SourceMap([[0, 1]]),
  ])
  return annotationElement


module.exports = parse
