const parse = require('./parse');
const compileFromApiElements = require('./compile');


const compile = (source, filename, callback) =>
  // All regular parser-related or compilation-related annotations
  // should be returned in the "compilation result". Callback should get
  // an error only in case of unexpected crash.

  parse(source, function(err, parseResult) {
    // If 'apiElements' isn't empty, then we don't need to care about 'err'
    // as it should be represented by annotation inside 'apiElements'
    // and compilation should be able to deal with it and to propagate it.
    let compilationResult;
    if (!(parseResult != null ? parseResult.apiElements : undefined)) {
      if (err) { return callback(null, createParserErrorCompilationResult(err.message)); }

      const message = 'The API description parser was unable to provide a valid parse result';
      return callback(null, createParserErrorCompilationResult(message));
    }

    // The try/catch is just to deal with unexpected crash. Compilation passes
    // all errors as part of the 'result' and it should not throw anything
    // in any case.
    try {
      const {mediaType, apiElements} = parseResult;
      compilationResult = compileFromApiElements(mediaType, apiElements, filename);
    } catch (error) {
      err = error;
      return callback(err);
    }

    return callback(null, compilationResult);
  })
;


var createParserErrorCompilationResult = message =>
  ({
    mediaType: null,
    transactions: [],
    annotations: [{type: 'error', component: 'apiDescriptionParser', message, location: [[0, 1]]}]
  })
;


module.exports = {compile};
