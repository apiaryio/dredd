module.exports = function compileAnnotation(annotationElement) {
  return {
    type: annotationElement.classes.getValue(0),
    component: 'apiDescriptionParser',
    message: annotationElement.toValue(),
    location: annotationElement.sourceMapValue || [[0, 1]],
  };
};
