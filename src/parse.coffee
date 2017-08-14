fury = require('fury')
fury.use(require('fury-adapter-apib-parser'))
fury.use(require('fury-adapter-swagger'))


createWarning = (message) ->
  annotation = new fury.minim.elements.Annotation(message)
  annotation.classes.push('warning')
  return annotation


parse = (source, callback) ->
  warning = null
  adapters = fury.detect(source)

  if adapters.length
    mediaType = adapters[0].mediaTypes[0]
  else
    mediaType = 'text/vnd.apiblueprint'
    warning = createWarning('''\
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
      apiElements.unshift(warning) if warning
      apiElements.freeze() # Adds 'parent' properties, prevents mutation
    else
      apiElements = null

    callback(err, {mediaType, apiElements})
  )


module.exports = parse
