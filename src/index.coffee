parse = require('./parse')
compileFromApiElements = require('./compile')


compile = (source, filename, callback) ->
  # All regular parser-related or compilation-related annotations
  # should be returned in the "compilation result". Callback should get
  # an error only in case of unexpected crash.

  parse(source, (err, parseResult) ->
    # If 'apiElements' isn't empty, then we don't need to care about 'err'
    # as it should be represented by annotation inside 'apiElements'
    # and compilation should be able to deal with it and to propagate it.
    if not parseResult?.apiElements
      return callback(null, createParserErrorCompilationResult(err.message)) if err

      message = 'The API description parser was unable to provide a valid parse result'
      return callback(null, createParserErrorCompilationResult(message))

    # The try/catch is just to deal with unexpected crash. Compilation passes
    # all errors as part of the 'result' and it should not throw anything
    # in any case.
    try
      {mediaType, apiElements} = parseResult
      compilationResult = compileFromApiElements(mediaType, apiElements, filename)
    catch err
      return callback(err)

    callback(null, compilationResult)
  )


createParserErrorCompilationResult = (message) ->
  return {
    mediaType: null
    transactions: []
    annotations: [{type: 'error', component: 'apiDescriptionParser', message, location: [[0, 1]]}]
  }


module.exports = {compile}
