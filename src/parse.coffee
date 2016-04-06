
protagonist = require('protagonist')


parse = (apiDescriptionDocument, callback) ->
  options = {generateSourceMap: true}
  protagonist.parse(apiDescriptionDocument, options, (err, result) ->
    if not (err or result)
      err = new Error('Unexpected parser error occurred.')
    else if err
      # Turning Protagonist error object into standard JavaScript error
      err = new Error(err.message)

    # If no parse result is present, indicate that with 'null', not 'undefined'
    callback(err, result or null)
  )


module.exports = {parse}
