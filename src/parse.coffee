
deckardcain = require('deckardcain')
fury = require('fury')
fury.use(require('fury-adapter-apib-parser'))
fury.use(require('fury-adapter-swagger'))

JSON06Serialiser = require('minim/lib/serialisers/json-0.6')
serialiser =  new JSON06Serialiser(fury.minim)

createAnnotation = (message, type) ->
  {
    element: 'annotation'
    meta: {classes: [type]}
    content: message
  }


parse = (source, callback) ->
  annotations = []
  mediaType = deckardcain.identify(source)

  unless mediaType
    mediaType = 'text/vnd.apiblueprint'
    annotations.push(createAnnotation('''\
      Could not recognize API description format. \
      Falling back to API Blueprint by default.\
    ''', 'warning'))

  args = {source, mediaType, generateSourceMap: true}
  fury.parse(args, (err, apiElements) ->
    if not (err or apiElements)
      err = new Error('Unexpected parser error occurred.')
    else if err
      # Turning Fury error object into standard JavaScript error
      err = new Error(err.message)

    if apiElements
      apiElements = serialiser.serialise(apiElements)
      apiElements.content = apiElements.content.concat(annotations)
    else
      apiElements = null

    callback(err, {mediaType, apiElements})
  )


module.exports = parse
