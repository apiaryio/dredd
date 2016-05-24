
fury = require('fury')
fury.use(require('fury-adapter-apib-parser'))
fury.use(require('fury-adapter-swagger'))


parse = (source, callback) ->
  fury.parse({source, generateSourceMap: true}, (err, result) ->
    if not (err or result)
      err = new Error('Unexpected parser error occurred.')
    else if err
      # Turning Fury error object into standard JavaScript error
      err = new Error(err.message)

    # If no parse result is present, indicate that with 'null',
    # not with 'undefined'.
    callback(err, (if result then result.toRefract() else null))
  )


module.exports = parse
