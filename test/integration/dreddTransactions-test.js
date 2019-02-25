const proxyquire = require('proxyquire').noPreserveCache();

const createCompileResultSchema = require('../schemas/createCompileResultSchema');
const createAnnotationSchema = require('../schemas/createAnnotationSchema');
const dreddTransactions = require('../../lib/index');

const { assert, fixtures } = require('../support');


describe('Dredd Transactions', () => {
  describe('when compilation throws an exception', () => {
    const error = new Error('... dummy message ...');
    let err;
    let compileResult;

    beforeEach((done) => {
      const stubbedDreddTransactions = proxyquire('../../lib/index', {
        './compile': () => { throw error; },
      });
      stubbedDreddTransactions.compile('... dummy API description document ...', null, (...args) => {
        [err, compileResult] = args;
        done();
      });
    });

    it('passes the error to callback', () => {
      assert.equal(err, error);
    });
    it('passes no compile result to callback', () => {
      assert.isUndefined(compileResult);
    });
  });

  describe('when given empty API description document', () => {
    let compileResult;

    beforeEach((done) => {
      dreddTransactions.compile('', null, (err, result) => {
        compileResult = result;
        done(err);
      });
    });

    it('produces one annotation, no transactions', () => {
      assert.jsonSchema(compileResult, createCompileResultSchema({
        annotations: 1,
        transactions: 0,
      }));
    });
    it('produces warning about falling back to API Blueprint', () => {
      assert.jsonSchema(compileResult.annotations[0], createAnnotationSchema({
        type: 'warning',
        component: 'apiDescriptionParser',
        message: 'assuming API Blueprint',
      }));
    });
  });

  describe('when given unknown API description format', () => {
    const apiDescription = '... unknown API description format ...';
    let compileResult;

    beforeEach((done) => {
      dreddTransactions.compile(apiDescription, null, (err, result) => {
        compileResult = result;
        done(err);
      });
    });

    it('produces two annotations, no transactions', () => {
      assert.jsonSchema(compileResult, createCompileResultSchema({
        annotations: 2,
        transactions: 0,
      }));
    });
    it('produces warning about falling back to API Blueprint', () => {
      assert.jsonSchema(compileResult.annotations[0], createAnnotationSchema({
        type: 'warning',
        component: 'apiDescriptionParser',
        message: 'assuming API Blueprint',
      }));
    });
    it('produces a warning about the API Blueprint not being valid', () => {
      assert.jsonSchema(compileResult.annotations[1], createAnnotationSchema({
        type: 'warning',
        component: 'apiDescriptionParser',
        message: 'expected',
      }));
    });
  });

  describe('when given unrecognizable API Blueprint format', () => {
    let compileResult;
    const { apiDescription } = fixtures('unrecognizable').apib;

    beforeEach((done) => {
      dreddTransactions.compile(apiDescription, null, (err, result) => {
        compileResult = result;
        done(err);
      });
    });

    it('produces one annotation', () => {
      assert.jsonSchema(compileResult, createCompileResultSchema({
        annotations: 1,
        transactions: 0,
      }));
    });
    it('produces no errors', () => {
      const errors = compileResult.annotations.filter(annotation => annotation.type === 'error');
      assert.deepEqual(errors, []);
    });
    it('produces a warning about falling back to API Blueprint', () => {
      assert.jsonSchema(compileResult.annotations[0], createAnnotationSchema({
        type: 'warning',
        component: 'apiDescriptionParser',
        message: 'assuming API Blueprint',
      }));
    });
  });

  describe('when given API description with errors', () => {
    fixtures('parser-error').forEachDescribe(({ apiDescription }) => {
      let compileResult;

      beforeEach((done) => {
        dreddTransactions.compile(apiDescription, null, (err, result) => {
          compileResult = result;
          done(err);
        });
      });

      it('produces some annotations, no transactions', () => {
        assert.jsonSchema(compileResult, createCompileResultSchema({
          annotations: [1],
          transactions: 0,
        }));
      });
      it('produces errors', () => {
        assert.jsonSchema(compileResult.annotations, {
          type: 'array',
          items: createAnnotationSchema({ type: 'error' }),
        });
      });
    });
  });

  describe('when given API description with warnings', () => {
    fixtures('parser-warning').forEachDescribe(({ apiDescription }) => {
      let compileResult;

      beforeEach((done) => {
        dreddTransactions.compile(apiDescription, null, (err, result) => {
          compileResult = result;
          done(err);
        });
      });

      it('produces some annotations', () => {
        assert.jsonSchema(compileResult, createCompileResultSchema({
          annotations: [1],
        }));
      });
      it('produces warnings', () => {
        assert.jsonSchema(compileResult.annotations, {
          type: 'array',
          items: createAnnotationSchema({ type: 'warning' }),
        });
      });
    });
  });

  describe('when given valid API description', () => {
    fixtures('ordinary').forEachDescribe(({ apiDescription }) => {
      let compileResult;

      beforeEach((done) => {
        dreddTransactions.compile(apiDescription, null, (err, result) => {
          compileResult = result;
          done(err);
        });
      });

      it('produces no annotations and some transactions', () => {
        assert.jsonSchema(compileResult, createCompileResultSchema());
      });
    });
  });

  describe('when parser unexpectedly provides an error', () => {
    const error = new Error('... dummy message ...');
    let err;
    let compileResult;

    beforeEach((done) => {
      const stubbedDreddTransactions = proxyquire('../../lib/index', {
        './parse': (apiDescription, callback) => callback(error),
      });
      stubbedDreddTransactions.compile('... dummy API description document ...', null, (...args) => {
        [err, compileResult] = args;
        done();
      });
    });

    it('passes the error to callback', () => {
      assert.equal(err, error);
    });
    it('passes no compile result to callback', () => {
      assert.isUndefined(compileResult);
    });
  });
});
