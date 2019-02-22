const parse = require('./parse');
const compileFromApiElements = require('./compile');


function compile(apiDescription, filename, callback) {
  parse(apiDescription, (err, parseResult) => {
    // Shouldn't happen, 'parse' turns all parser crashes into annotations
    if (err) { callback(err); return; }

    // Should always set annotations and never throw, try/catch deals only
    // with unexpected compiler crashes
    let compilationResult;
    try {
      const { mediaType, apiElements } = parseResult;
      compilationResult = compileFromApiElements(mediaType, apiElements, filename);
    } catch (syncErr) {
      callback(syncErr);
      return;
    }
    callback(null, compilationResult);
  });
}


module.exports = { compile };
