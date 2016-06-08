
fury = require('fury')
fury.use(require('fury-adapter-apib-parser'))
fury.use(require('fury-adapter-swagger'))


furyParse = (source, options, callback) ->
  [callback, options] = [options, {}] if typeof options is 'function'

  args = {source, generateSourceMap: true}
  args.mediaType = 'text/vnd.apiblueprint' if options.forceApiBlueprint

  fury.parse(args, (err, result) ->
    if not (err or result)
      err = new Error('Unexpected parser error occurred.')
    else if err
      # Turning Fury error object into standard JavaScript error
      err = new Error(err.message)

    # If no parse result is present, indicate that with 'null',
    # not with 'undefined'.
    callback(err, (if result then result.toRefract() else null))
  )


parse = (source, callback) ->
  furyParse(source, (err, result) ->
    if err and err.message.match(/document.+match.+registered.+parser/i)
      annotation =
        element: 'annotation'
        meta: {classes: ['warning']}
        content: "#{err.message} Falling back to API Blueprint by default."

      # Fury wasn't able to recognize document format, falling back
      # to API Blueprint
      furyParse(source, {forceApiBlueprint: true}, (err, result) ->
        result.content.push(annotation) if result
        callback(err, result)
      )
    else
      callback(err, result)
  )


module.exports = parse
