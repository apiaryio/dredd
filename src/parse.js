const fury = require('fury');
fury.use(require('fury-adapter-apib-parser'));
fury.use(require('fury-adapter-swagger'));


const parse = function(source, callback) {
  let mediaType;
  let warningElement = null;
  const adapters = fury.detect(source);

  if (adapters.length) {
    mediaType = adapters[0].mediaTypes[0];
  } else {
    mediaType = 'text/vnd.apiblueprint';
    warningElement = createWarning(`\
Could not recognize API description format. \
Falling back to API Blueprint by default.\
`);
  }

  const args = {source, mediaType, generateSourceMap: true};
  return fury.parse(args, function(err, apiElements) {
    if (!(err || apiElements)) {
      err = new Error('Unexpected parser error occurred.');
    } else if (err) {
      // Turning Fury error object into standard JavaScript error
      err = new Error(err.message);
    }

    if (apiElements) {
      if (warningElement) { apiElements.unshift(warningElement); }
    } else {
      apiElements = null;
    }

    return callback(err, {mediaType, apiElements});
  });
};


var createWarning = function(message) {
  const annotationElement = new fury.minim.elements.Annotation(message);
  annotationElement.classes.push('warning');
  annotationElement.attributes.set('sourceMap', [
    new fury.minim.elements.SourceMap([[0, 1]]),
  ]);
  return annotationElement;
};


module.exports = parse;
