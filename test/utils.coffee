
chai = require('chai')
chai.use(require('chai-json-schema'))

proxyquire = require('proxyquire').noPreserveCache()
tv4 = require('tv4')

parse = require('../src/parse')


# Takes a fixture and parses it so we can test the compilation process.
compileFixture = (source, options, done) ->
  [done, options] = [options, {}] if typeof options is 'function'

  if options.stubs
    compile = proxyquire('../src/compile', options.stubs)
  else
    compile = require('../src/compile')

  parse(source, (err, parseResult) ->
    # Intentionally not passing any parse errors to `done()` here. They'll
    # appear in the `parseResult` too in form of annotations and we're testing
    # whether the compilation is able to deal with them.
    try
      {mediaType, apiElements} = parseResult
      result = compile(mediaType, apiElements, options.filename)
      done(null, result)
    catch err
      done(err)
  )


module.exports = {compileFixture, assert: chai.assert}
