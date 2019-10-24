function compileLocation(sourceMapElement) {
  try {
    const startAttributes = sourceMapElement.first.first.first.attributes;
    const endAttributes = sourceMapElement.last.last.last.attributes;
    return [
      [
        startAttributes.get('line').toValue(),
        startAttributes.get('column').toValue(),
      ],
      [
        endAttributes.get('line').toValue(),
        endAttributes.get('column').toValue(),
      ],
    ];
  } catch (e) {
    return null;
  }
}


module.exports = function compileAnnotation(annotationElement) {
  return {
    type: annotationElement.classes.getValue(0),
    component: 'apiDescriptionParser',
    message: annotationElement.toValue(),
    location: compileLocation(annotationElement.attributes.get('sourceMap')),
  };
};
