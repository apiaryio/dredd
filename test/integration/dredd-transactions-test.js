const sinon = require('sinon');
const proxyquire = require('proxyquire').noPreserveCache();

const fixtures = require('../fixtures');
const {assert} = require('../utils');
const createCompilationResultSchema = require('../schemas/compilation-result');
const createAnnotationSchema = require('../schemas/annotation');
const dreddTransactions = require('../../src/index');


describe('Dredd Transactions', function() {
  describe('When compilation throws an exception', function() {
    let err = undefined;
    const error = new Error('... dummy message ...');
    let compilationResult = undefined;

    beforeEach(function(done) {
      const dt = proxyquire('../../src/index',
        {'./compile'(...args) { throw error; }}
      );
      return dt.compile('... dummy API description document ...', null, function(...args) {
        [err, compilationResult] = Array.from(args);
        return done();
      });
    });

    it('passes the error to callback', () => assert.equal(err, error));
    return it('passes no compilation result to callback', () => assert.isUndefined(compilationResult));
  });

  describe('When given empty API description document', function() {
    let compilationResult = undefined;

    return fixtures.empty.forEachDescribe(function({source}) {
      beforeEach(done =>
        dreddTransactions.compile(source, null, function(...args) {
          let err;
          [err, compilationResult] = Array.from(args);
          return done(err);
        })
      );

      it('produces one annotation, no transactions', () =>
        assert.jsonSchema(compilationResult, createCompilationResultSchema({
          annotations: 1,
          transactions: 0
        }))
      );
      return it('produces warning about falling back to API Blueprint', () =>
        assert.jsonSchema(compilationResult.annotations[0], createAnnotationSchema({
          type: 'warning',
          component: 'apiDescriptionParser',
          message: 'to API Blueprint'
        }))
      );
    });
  });

  describe('When given unknown API description format', function() {
    let compilationResult = undefined;
    const source = `\
... unknown API description format ...\
`;

    beforeEach(done =>
      dreddTransactions.compile(source, null, function(...args) {
        let err;
        [err, compilationResult] = Array.from(args);
        return done(err);
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
    return it('produces a warning about the API Blueprint not being valid', () =>
      assert.jsonSchema(compilationResult.annotations[1], createAnnotationSchema({
        type: 'warning',
        component: 'apiDescriptionParser',
        message: 'expected'
      }))
    );
  });

  describe('When given unrecognizable API Blueprint format', function() {
    let compilationResult = undefined;
    const source = fixtures.unrecognizable.apiBlueprint;

    beforeEach(done =>
      dreddTransactions.compile(source, null, function(...args) {
        let err;
        [err, compilationResult] = Array.from(args);
        return done(err);
      })
    );

    it('produces two annotations', () =>
      assert.jsonSchema(compilationResult, createCompilationResultSchema({
        annotations: 2
      }))
    );
    it('produces no errors', function() {
      const errors = compilationResult.annotations.filter(annotation => annotation.type === 'error');
      return assert.deepEqual(errors, []);
    });
    it('produces a warning about falling back to API Blueprint', () =>
      assert.jsonSchema(compilationResult.annotations[0], createAnnotationSchema({
        type: 'warning',
        component: 'apiDescriptionParser',
        message: 'to API Blueprint'
      }))
    );
    return it('produces a warning about missing HTTP status code', () =>
      // "+ Response XXX" would be a match in the API Blueprint detection,
      // so the fixture omits the HTTP status code to prevent that
      assert.jsonSchema(compilationResult.annotations[1], createAnnotationSchema({
        type: 'warning',
        component: 'apiDescriptionParser',
        message: 'missing response HTTP status code'
      }))
    );
  });

  describe('When given API description with errors', function() {
    let compilationResult = undefined;

    return fixtures.parserError.forEachDescribe(function({source}) {
      beforeEach(done =>
        dreddTransactions.compile(source, null, function(...args) {
          let err;
          [err, compilationResult] = Array.from(args);
          return done(err);
        })
      );

      it('produces some annotations, no transactions', () =>
        assert.jsonSchema(compilationResult, createCompilationResultSchema({
          annotations: [1],
          transactions: 0
        }))
      );
      return it('produces errors', () =>
        assert.jsonSchema(compilationResult.annotations, {
          type: 'array',
          items: createAnnotationSchema({type: 'error'})
        }
        )
      );
    });
  });

  describe('When given API description with warnings', function() {
    let compilationResult = undefined;

    return fixtures.parserWarning.forEachDescribe(function({source}) {
      beforeEach(done =>
        dreddTransactions.compile(source, null, function(...args) {
          let err;
          [err, compilationResult] = Array.from(args);
          return done(err);
        })
      );

      it('produces some annotations', () =>
        assert.jsonSchema(compilationResult, createCompilationResultSchema({
          annotations: [1]
        }))
      );
      return it('produces warnings', () =>
        assert.jsonSchema(compilationResult.annotations, {
          type: 'array',
          items: createAnnotationSchema({type: 'warning'})
        }
        )
      );
    });
  });

  describe('When given valid API description', function() {
    let compilationResult = undefined;

    return fixtures.ordinary.forEachDescribe(function({source}) {
      beforeEach(done =>
        dreddTransactions.compile(source, null, function(...args) {
          let err;
          [err, compilationResult] = Array.from(args);
          return done(err);
        })
      );

      return it('produces no annotations and some transactions', () => assert.jsonSchema(compilationResult, createCompilationResultSchema()));
    });
  });

  describe('When parser unexpectedly provides just error and no API Elements', function() {
    let compilationResult = undefined;
    const source = '... dummy API description document ...';
    const message = '... dummy error message ...';

    beforeEach(function(done) {
      const dt = proxyquire('../../src/index', {
        './parse'(input, callback) {
          return callback(new Error(message));
        }
      }
      );
      return dt.compile(source, null, function(...args) {
        let err;
        [err, compilationResult] = Array.from(args);
        return done(err);
      });
    });

    it('produces one annotation, no transactions', () =>
      assert.jsonSchema(compilationResult, createCompilationResultSchema({
        annotations: 1,
        transactions: 0
      }))
    );
    return it('turns the parser error into a valid annotation', () =>
      assert.jsonSchema(compilationResult.annotations[0], createAnnotationSchema({
        type: 'error',
        message
      }))
    );
  });

  describe('When parser unexpectedly provides error and malformed API Elements', function() {
    let compilationResult = undefined;
    const source = '... dummy API description document ...';
    const message = '... dummy error message ...';

    beforeEach(function(done) {
      const dt = proxyquire('../../src/index', {
        './parse'(input, callback) {
          return callback(new Error(message), {dummy: true});
        }
      }
      );
      return dt.compile(source, null, function(...args) {
        let err;
        [err, compilationResult] = Array.from(args);
        return done(err);
      });
    });

    it('produces one annotation, no transactions', () =>
      assert.jsonSchema(compilationResult, createCompilationResultSchema({
        annotations: 1,
        transactions: 0
      }))
    );
    return it('turns the parser error into a valid annotation', () =>
      assert.jsonSchema(compilationResult.annotations[0], createAnnotationSchema({
        type: 'error',
        message
      }))
    );
  });

  return describe('When parser unexpectedly provides malformed API Elements only', function() {
    let compilationResult = undefined;
    const source = '... dummy API description document ...';

    beforeEach(function(done) {
      const dt = proxyquire('../../src/index', {
        './parse'(input, callback) {
          return callback(null, {dummy: true});
        }
      }
      );
      return dt.compile(source, null, function(...args) {
        let err;
        [err, compilationResult] = Array.from(args);
        return done(err);
      });
    });

    it('produces one annotation, no transactions', () =>
      assert.jsonSchema(compilationResult, createCompilationResultSchema({
        annotations: 1,
        transactions: 0
      }))
    );
    return it('produces an error about parser failure', () =>
      assert.jsonSchema(compilationResult.annotations[0], createAnnotationSchema({
        type: 'error',
        message: 'parser was unable to provide a valid parse result'
      }))
    );
  });
});
