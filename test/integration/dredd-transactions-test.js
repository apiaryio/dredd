const proxyquire = require('proxyquire').noPreserveCache();

const createCompilationResultSchema = require('../schemas/compilation-result');
const createAnnotationSchema = require('../schemas/annotation');
const dreddTransactions = require('../../lib/index');

const { assert, fixtures } = require('../support');

describe('Dredd Transactions', () => {
  describe('when compilation throws an exception', () => {
    const error = new Error('... dummy message ...');
    let err;
    let compilationResult;

    beforeEach((done) => {
      const stubbedDreddTransactions = proxyquire('../../lib/index', {
        './compile': () => { throw error; },
      });
      stubbedDreddTransactions.compile('... dummy API description document ...', null, (...args) => {
        [err, compilationResult] = args;
        done();
      });
    });

    it('passes the error to callback', () => {
      assert.equal(err, error);
    });
    it('passes no compilation result to callback', () => {
      assert.isUndefined(compilationResult);
    });
  });

  describe('when given empty API description document', () => {
    let compilationResult;

    beforeEach((done) => {
      dreddTransactions.compile('', null, (err, result) => {
        compilationResult = result;
        done(err);
      });
    });

    it('produces one annotation, no transactions', () => {
      assert.jsonSchema(compilationResult, createCompilationResultSchema({
        annotations: 1,
        transactions: 0,
      }));
    });
    it('produces warning about falling back to API Blueprint', () => {
      assert.jsonSchema(compilationResult.annotations[0], createAnnotationSchema({
        type: 'warning',
        component: 'apiDescriptionParser',
        message: 'assuming API Blueprint',
      }));
    });
  });

  describe('when given unknown API description format', () => {
    const apiDescription = '... unknown API description format ...';
    let compilationResult;

    beforeEach((done) => {
      dreddTransactions.compile(apiDescription, null, (err, result) => {
        compilationResult = result;
        done(err);
      });
    });

    it('produces two annotations, no transactions', () => {
      assert.jsonSchema(compilationResult, createCompilationResultSchema({
        annotations: 2,
        transactions: 0,
      }));
    });
    it('produces warning about falling back to API Blueprint', () => {
      assert.jsonSchema(compilationResult.annotations[0], createAnnotationSchema({
        type: 'warning',
        component: 'apiDescriptionParser',
        message: 'assuming API Blueprint',
      }));
    });
    it('produces a warning about the API Blueprint not being valid', () => {
      assert.jsonSchema(compilationResult.annotations[1], createAnnotationSchema({
        type: 'warning',
        component: 'apiDescriptionParser',
        message: 'expected',
      }));
    });
  });

  describe('when given unrecognizable API Blueprint format', () => {
    let compilationResult;
    const { apiDescription } = fixtures('unrecognizable').apib;

    beforeEach((done) => {
      dreddTransactions.compile(apiDescription, null, (err, result) => {
        compilationResult = result;
        done(err);
      });
    });

    it('produces one annotation', () => {
      assert.jsonSchema(compilationResult, createCompilationResultSchema({
        annotations: 1,
        transactions: 0,
      }));
    });
    it('produces no errors', () => {
      const errors = compilationResult.annotations.filter(annotation => annotation.type === 'error');
      assert.deepEqual(errors, []);
    });
    it('produces a warning about falling back to API Blueprint', () => {
      assert.jsonSchema(compilationResult.annotations[0], createAnnotationSchema({
        type: 'warning',
        component: 'apiDescriptionParser',
        message: 'assuming API Blueprint',
      }));
    });
  });

  describe('when given API description with errors', () => {
    fixtures('parser-error').forEachDescribe(({ apiDescription }) => {
      let compilationResult;

      beforeEach((done) => {
        dreddTransactions.compile(apiDescription, null, (err, result) => {
          compilationResult = result;
          done(err);
        });
      });

      it('produces some annotations, no transactions', () => {
        assert.jsonSchema(compilationResult, createCompilationResultSchema({
          annotations: [1],
          transactions: 0,
        }));
      });
      it('produces errors', () => {
        assert.jsonSchema(compilationResult.annotations, {
          type: 'array',
          items: createAnnotationSchema({ type: 'error' }),
        });
      });
    });
  });

  describe('when given API description with warnings', () => {
    fixtures('parser-warning').forEachDescribe(({ apiDescription }) => {
      let compilationResult;

      beforeEach((done) => {
        dreddTransactions.compile(apiDescription, null, (err, result) => {
          compilationResult = result;
          done(err);
        });
      });

      it('produces some annotations', () => {
        assert.jsonSchema(compilationResult, createCompilationResultSchema({
          annotations: [1],
        }));
      });
      it('produces warnings', () => {
        assert.jsonSchema(compilationResult.annotations, {
          type: 'array',
          items: createAnnotationSchema({ type: 'warning' }),
        });
      });
    });
  });

  describe('when given valid API description', () => {
    fixtures('ordinary').forEachDescribe(({ apiDescription }) => {
      let compilationResult;

      beforeEach((done) => {
        dreddTransactions.compile(apiDescription, null, (err, result) => {
          compilationResult = result;
          done(err);
        });
      });

      it('produces no annotations and some transactions', () => {
        assert.jsonSchema(compilationResult, createCompilationResultSchema());
      });
    });
  });

  describe('when parser unexpectedly provides an error', () => {
    const error = new Error('... dummy message ...');
    let err;
    let compilationResult;

    beforeEach((done) => {
      const stubbedDreddTransactions = proxyquire('../../lib/index', {
        './parse': (apiDescription, callback) => callback(error),
      });
      stubbedDreddTransactions.compile('... dummy API description document ...', null, (...args) => {
        [err, compilationResult] = args;
        done();
      });
    });

    it('passes the error to callback', () => {
      assert.equal(err, error);
    });
    it('passes no compilation result to callback', () => {
      assert.isUndefined(compilationResult);
    });
  });
});
