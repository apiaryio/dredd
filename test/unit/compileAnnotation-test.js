const fury = require('fury');
const { assert } = require('chai');

const compileAnnotation = require('../../compile/compileAnnotation');


describe('compileAnnotation()', () => {
  const { Annotation } = fury.minim.elements;

  it('sets the type to error for error annotations', () => {
    const annotationElement = new Annotation('Ouch!');
    annotationElement.classes.push('error');
    const annotation = compileAnnotation(annotationElement);

    assert.propertyVal(annotation, 'type', 'error');
  });
  it('sets the type to warning for warning annotations', () => {
    const annotationElement = new Annotation('Ouch!');
    annotationElement.classes.push('warning');
    const annotation = compileAnnotation(annotationElement);

    assert.propertyVal(annotation, 'type', 'warning');
  });
  it('sets the source component of the annotation to parser', () => {
    const annotationElement = new Annotation('Ouch!');
    const annotation = compileAnnotation(annotationElement);

    assert.propertyVal(annotation, 'component', 'apiDescriptionParser');
  });
  it('sets message of the annotation', () => {
    const annotationElement = new Annotation('Ouch!');
    const annotation = compileAnnotation(annotationElement);

    assert.propertyVal(annotation, 'message', 'Ouch!');
  });
});
