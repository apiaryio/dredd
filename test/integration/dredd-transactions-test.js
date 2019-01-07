const proxyquire = require('proxyquire').noPreserveCache();

const createCompilationResultSchema = require('../schemas/compilation-result');
const createAnnotationSchema = require('../schemas/annotation');
const dreddTransactions = require('../../lib/index');
const fixtures = require('../fixtures');

const { assert } = require('../utils');

describe('Dredd Transactions', () => {
  describe('When compilation throws an exception', () => {
    let err;
    const error = new Error('... dummy message ...');
    let compilationResult;

    beforeEach((done) => {
      const dt = proxyquire('../../lib/index',
        { './compile': () => { throw error; } }
      );
      dt.compile('... dummy API description document ...', null, (...args) => {
        [err, compilationResult] = Array.from(args);
        done();
      });
    });

    it('passes the error to callback', () => assert.equal(err, error));
    it('passes no compilation result to callback', () => assert.isUndefined(compilationResult));
  });

  describe('When given empty API description document', () => {
    let compilationResult;

    fixtures.empty.forEachDescribe(({ source }) => {
      beforeEach(done =>
        dreddTransactions.compile(source, null, (...args) => {
          let err;
          [err, compilationResult] = Array.from(args); // eslint-disable-line
          done(err);
        })
      );

      it('produces one annotation, no transactions', () =>
        assert.jsonSchema(compilationResult, createCompilationResultSchema({
          annotations: 1,
          transactions: 0
        }))
      );

      it('produces warning about falling back to API Blueprint', () =>
        assert.jsonSchema(compilationResult.annotations[0], createAnnotationSchema({
          type: 'warning',
          component: 'apiDescriptionParser',
          message: 'to API Blueprint'
        }))
      );
    });
  });

  describe('When given unknown API description format', () => {
    let compilationResult;
    const source = '... unknown API description format ...';

    beforeEach(done =>
      dreddTransactions.compile(source, null, (...args) => {
        let err;
        [err, compilationResult] = Array.from(args); // eslint-disable-line
        done(err);
      })
    );

    it('produces two annotations, no transactions', () =>
      assert.jsonSchema(compilationResult, createCompilationResultSchema({
        annotations: 2,
        transactions: 0
      }))
    );

    it('produces warning about falling back to API Blueprint', () =>
      assert.jsonSchema(compilationResult.annotations[0], createAnnotationSchema({
        type: 'warning',
        component: 'apiDescriptionParser',
        message: 'to API Blueprint'
      }))
    );

    it('produces a warning about the API Blueprint not being valid', () =>
      assert.jsonSchema(compilationResult.annotations[1], createAnnotationSchema({
        type: 'warning',
        component: 'apiDescriptionParser',
        message: 'expected'
      }))
    );
  });

  describe('When given unrecognizable API Blueprint format', () => {
    let compilationResult;
    const source = fixtures.unrecognizable.apiBlueprint;

    beforeEach(done =>
      dreddTransactions.compile(source, null, (...args) => {
        let err;
        [err, compilationResult] = Array.from(args); // eslint-disable-line
        done(err);
      })
    );

    it('produces one annotation', () =>
      assert.jsonSchema(compilationResult, createCompilationResultSchema({
        annotations: 1,
        transactions: 0
      }))
    );

    it('produces no errors', () => {
      const errors = compilationResult.annotations.filter(annotation => annotation.type === 'error');
      assert.deepEqual(errors, []);
    });

    it('produces a warning about falling back to API Blueprint', () =>
      assert.jsonSchema(compilationResult.annotations[0], createAnnotationSchema({
        type: 'warning',
        component: 'apiDescriptionParser',
        message: 'to API Blueprint'
      }))
    );
  });

  describe('When given API description with errors', () => {
    let compilationResult;

    fixtures.parserError.forEachDescribe(({ source }) => {
      beforeEach(done =>
        dreddTransactions.compile(source, null, (...args) => {
          let err;
          [err, compilationResult] = Array.from(args); // eslint-disable-line
          done(err);
        })
      );

      it('produces some annotations, no transactions', () =>
        assert.jsonSchema(compilationResult, createCompilationResultSchema({
          annotations: [1],
          transactions: 0
        }))
      );

      it('produces errors', () =>
        assert.jsonSchema(compilationResult.annotations, {
          type: 'array',
          items: createAnnotationSchema({ type: 'error' })
        })
      );
    });
  });

  describe('When given API description with warnings', () => {
    let compilationResult;

    fixtures.parserWarning.forEachDescribe(({ source }) => {
      beforeEach(done =>
        dreddTransactions.compile(source, null, (...args) => {
          let err;
          [err, compilationResult] = Array.from(args); // eslint-disable-line
          done(err);
        })
      );

      it('produces some annotations', () =>
        assert.jsonSchema(compilationResult, createCompilationResultSchema({
          annotations: [1]
        }))
      );

      it('produces warnings', () =>
        assert.jsonSchema(compilationResult.annotations, {
          type: 'array',
          items: createAnnotationSchema({ type: 'warning' })
        })
      );
    });
  });

  describe('When given valid API description', () => {
    let compilationResult;

    fixtures.ordinary.forEachDescribe(({ source }) => {
      beforeEach(done =>
        dreddTransactions.compile(source, null, (...args) => {
          let err;
          [err, compilationResult] = Array.from(args); // eslint-disable-line
          done(err);
        })
      );

      it('produces no annotations and some transactions', () => assert.jsonSchema(compilationResult, createCompilationResultSchema()));
    });
  });

  describe('When parser unexpectedly provides just error and no API Elements', () => {
    let compilationResult;
    const source = '... dummy API description document ...';
    const message = '... dummy error message ...';

    beforeEach((done) => {
      const dt = proxyquire('../../lib/index', {
        './parse': (input, callback) => callback(new Error(message))
      });
      dt.compile(source, null, (...args) => {
        let err;
        [err, compilationResult] = Array.from(args); // eslint-disable-line
        done(err);
      });
    });

    it('produces one annotation, no transactions', () =>
      assert.jsonSchema(compilationResult, createCompilationResultSchema({
        annotations: 1,
        transactions: 0
      }))
    );

    it('turns the parser error into a valid annotation', () =>
      assert.jsonSchema(compilationResult.annotations[0], createAnnotationSchema({
        type: 'error',
        message
      }))
    );
  });

  describe('When parser unexpectedly provides error and malformed API Elements', () => {
    let compilationResult;
    const source = '... dummy API description document ...';
    const message = '... dummy error message ...';

    beforeEach((done) => {
      const dt = proxyquire('../../lib/index', {
        './parse': (input, callback) => callback(new Error(message), { dummy: true })
      });
      dt.compile(source, null, (...args) => {
        let err;
        [err, compilationResult] = Array.from(args); // eslint-disable-line
        done(err);
      });
    });

    it('produces one annotation, no transactions', () =>
      assert.jsonSchema(compilationResult, createCompilationResultSchema({
        annotations: 1,
        transactions: 0
      }))
    );

    it('turns the parser error into a valid annotation', () =>
      assert.jsonSchema(compilationResult.annotations[0], createAnnotationSchema({
        type: 'error',
        message
      }))
    );
  });

  describe('When parser unexpectedly provides malformed API Elements only', () => {
    let compilationResult;
    const source = '... dummy API description document ...';

    beforeEach((done) => {
      const dt = proxyquire('../../lib/index', {
        './parse': (input, callback) => callback(null, { dummy: true })
      });
      dt.compile(source, null, (...args) => {
        let err;
        [err, compilationResult] = Array.from(args); // eslint-disable-line
        done(err);
      });
    });

    it('produces one annotation, no transactions', () =>
      assert.jsonSchema(compilationResult, createCompilationResultSchema({
        annotations: 1,
        transactions: 0
      }))
    );

    it('produces an error about parser failure', () =>
      assert.jsonSchema(compilationResult.annotations[0], createAnnotationSchema({
        type: 'error',
        message: 'parser was unable to provide a valid parse result'
      }))
    );
  });
});
