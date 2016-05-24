
fury = require('fury')
fury.use(require('fury-adapter-apib-parser'))


parse = (source, callback) ->
  fury.parse({source, generateSourceMap: true}, (err, result) ->
    if not (err or result)
      err = new Error('Unexpected parser error occurred.')
    else if err
      # Turning Fury error object into standard JavaScript error
      err = new Error(err.message)

    if result
      # Due to bug https://github.com/apiaryio/fury.js/pull/60 Fury sometimes
      # returns plain Refract instead of Minim-wrapped Refract.
      result = result.toRefract() if result.toRefract
    else
      # If no parse result is present, indicate that with 'null',
      # not with 'undefined'.
      result = null

    callback(err, result)
  )


module.exports = parse
