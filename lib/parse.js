const fury = require('fury');

fury.use(require('fury-adapter-apib-parser'));
fury.use(require('fury-adapter-swagger'));

function createWarning(message) {
  const annotationElement = new fury.minim.elements.Annotation(message);
  annotationElement.classes.push('warning');
  annotationElement.attributes.set('sourceMap', [
    new fury.minim.elements.SourceMap([[0, 1]])
  ]);
  return annotationElement;
}

function parse(source, callback) {
  let mediaType;
  let warningElement = null;
  const adapters = fury.detect(source);

  if (adapters.length) {
    [mediaType] = adapters[0].mediaTypes;
  } else {
    mediaType = 'text/vnd.apiblueprint';
    warningElement = createWarning(`
Could not recognize API description format.
Falling back to API Blueprint by default.
`);
  }

  const args = { source, mediaType, generateSourceMap: true };

  return fury.parse(args, (err, apiElements) => {
    let modifiedApiElements = apiElements;
    let nativeError = null;

    if (!(err || apiElements)) {
      nativeError = new Error('Unexpected parser error occurred.');
    } else if (err) {
      // Turning Fury error object into standard JavaScript error
      nativeError = new Error(err.message);
    }

    if (modifiedApiElements) {
      if (warningElement) { modifiedApiElements.unshift(warningElement); }
    } else {
      modifiedApiElements = null;
    }

    return callback(nativeError, { mediaType, apiElements: modifiedApiElements });
  });
}

module.exports = parse;
