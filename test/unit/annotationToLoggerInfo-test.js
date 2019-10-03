import { assert } from 'chai';

import annotationToLoggerInfo from '../../lib/annotationToLoggerInfo';

const PARSE_ANNOTATION_FIXTURE = {
  type: 'error',
  message: 'Ouch!',
  component: 'apiDescriptionParser',
  location: [[1, 2], [3, 4]],
};

const COMPILE_ANNOTATION_FIXTURE = {
  type: 'error',
  message: 'Ouch!',
  component: 'uriTemplateExpansion',
  origin: {
    apiName: 'Broken API',
    resourceName: 'Things',
    actionName: 'Retrieve Things',
  },
};

describe('annotationToLoggerInfo()', () => {
  describe('annotation.type', () => {
    it('chooses error logging level for error annotation type', () => {
      const loggerInfo = annotationToLoggerInfo('apiary.apib', {
        ...PARSE_ANNOTATION_FIXTURE,
        type: 'error',
      });
      assert.equal(loggerInfo.level, 'error');
    });
    it('chooses warn logging level for warning annotation type', () => {
      const loggerInfo = annotationToLoggerInfo('apiary.apib', {
        ...PARSE_ANNOTATION_FIXTURE,
        type: 'warning',
      });
      assert.equal(loggerInfo.level, 'warn');
    });
    it('throws for invalid annotation type', () => {
      assert.throws(
        () =>
          annotationToLoggerInfo('apiary.apib', {
            ...PARSE_ANNOTATION_FIXTURE,
            type: 'gargamel',
          }),
        'gargamel',
      );
    });
    it('propagates the type to the message for parse annotation', () => {
      const loggerInfo = annotationToLoggerInfo('apiary.apib', {
        ...PARSE_ANNOTATION_FIXTURE,
        type: 'warning',
      });
      assert.match(loggerInfo.message, /^API description [\s\S]+ warning in/);
    });
    it('propagates the type to the message for compile annotation', () => {
      const loggerInfo = annotationToLoggerInfo('apiary.apib', {
        ...COMPILE_ANNOTATION_FIXTURE,
        type: 'warning',
      });
      assert.match(loggerInfo.message, /^API description [\s\S]+ warning in/);
    });
  });

  describe('annotation.component', () => {
    it('formats apiDescriptionParser', () => {
      const loggerInfo = annotationToLoggerInfo('apiary.apib', {
        ...PARSE_ANNOTATION_FIXTURE,
        component: 'apiDescriptionParser',
      });
      assert.match(loggerInfo.message, /^API description parser error/);
    });
    it('formats parametersValidation', () => {
      const loggerInfo = annotationToLoggerInfo('apiary.apib', {
        ...COMPILE_ANNOTATION_FIXTURE,
        component: 'parametersValidation',
      });
      assert.match(
        loggerInfo.message,
        /^API description URI parameters validation error/,
      );
    });
    it('formats uriTemplateExpansion', () => {
      const loggerInfo = annotationToLoggerInfo('apiary.apib', {
        ...COMPILE_ANNOTATION_FIXTURE,
        component: 'uriTemplateExpansion',
      });
      assert.match(
        loggerInfo.message,
        /^API description URI template expansion error/,
      );
    });
    it('formats unexpected component with a generic name', () => {
      const loggerInfo = annotationToLoggerInfo('apiary.apib', {
        ...COMPILE_ANNOTATION_FIXTURE,
        component: 'gargamel',
      });
      assert.match(loggerInfo.message, /^API description error/);
    });
  });

  describe('annotation.origin', () => {
    it('uses transaction name as a location hint for compile annotations', () => {
      const loggerInfo = annotationToLoggerInfo('apiary.apib', {
        ...COMPILE_ANNOTATION_FIXTURE,
        component: 'parametersValidation',
      });
      assert.include(
        loggerInfo.message,
        'error in apiary.apib (Broken API > Things > Retrieve Things): Ouch!',
      );
    });
  });

  describe('annotation.location', () => {
    it('formats location for parse annotations', () => {
      const loggerInfo = annotationToLoggerInfo('apiary.apib', {
        ...PARSE_ANNOTATION_FIXTURE,
        location: [[1, 2], [3, 4]],
      });
      assert.include(
        loggerInfo.message,
        'error in apiary.apib:1 (from line 1 column 2 to line 3 column 4): Ouch!',
      );
    });
    it('formats location without end line if it is the same as the start line', () => {
      const loggerInfo = annotationToLoggerInfo('apiary.apib', {
        ...PARSE_ANNOTATION_FIXTURE,
        location: [[1, 2], [1, 4]],
      });
      assert.include(
        loggerInfo.message,
        'error in apiary.apib:1 (from line 1 column 2 to column 4): Ouch!',
      );
    });
    it('formats location without range if the start and the end are the same', () => {
      const loggerInfo = annotationToLoggerInfo('apiary.apib', {
        ...PARSE_ANNOTATION_FIXTURE,
        location: [[1, 2], [1, 2]],
      });
      assert.include(
        loggerInfo.message,
        'error in apiary.apib:1 (line 1 column 2): Ouch!',
      );
    });
    it('formats missing location', () => {
      const loggerInfo = annotationToLoggerInfo('apiary.apib', {
        ...PARSE_ANNOTATION_FIXTURE,
        location: null,
      });
      assert.include(loggerInfo.message, 'error in apiary.apib: Ouch!');
    });
  });
});
