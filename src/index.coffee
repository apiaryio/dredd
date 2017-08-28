
parse = require('./parse')
compileFromApiElements = require('./compile')


compile = (source, filename, callback) ->
  # All regular parser-related or compilation-related errors and warnings
  # should be returned in the "compilation result". Callback should get
  # an error only in case of unexpected crash.

  parse(source, (err, parseResult) ->
    # If 'apiElements' isn't empty, then we don't need to care about 'err'
    # as it should be represented by annotation inside 'apiElements'
    # and compilation should be able to deal with it and propagate it.
    if err and not parseResult
      return callback(null,
        mediaType: null
        transactions: []
        warnings: []
        errors: [{component: 'apiDescriptionParser', message: err.message}]
      )

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


module.exports = {compile}
