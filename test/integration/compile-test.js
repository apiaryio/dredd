const proxyquire = require('proxyquire').noPreserveCache();

const fixtures = require('../fixtures');
const createCompilationResultSchema = require('../schemas/compilation-result');
const createAnnotationSchema = require('../schemas/annotation');
const createLocationSchema = require('../schemas/location');
const createOriginSchema = require('../schemas/origin');
const {assert, compileFixture} = require('../utils');


describe('compile() · all API description formats', function() {
  const locationSchema = createLocationSchema();
  const originSchema = createOriginSchema();

  describe('ordinary, valid API description', function() {
    const filename = 'apiDescription.ext';

    return fixtures.ordinary.forEachDescribe(function({source}) {
      let compilationResult = undefined;

      before(done =>
        compileFixture(source, {filename}, function(...args) {
          let err;
          [err, compilationResult] = Array.from(args);
          return done(err);
        })
      );

      return it('is compiled into a compilation result of expected structure', () => assert.jsonSchema(compilationResult, createCompilationResultSchema({filename})));
    });
  });

  describe('causing an error in the parser', () =>
    fixtures.parserError.forEachDescribe(function({source}) {
      let compilationResult = undefined;

      before(done =>
        compileFixture(source, function(...args) {
          let err;
          [err, compilationResult] = Array.from(args);
          return done(err);
        })
      );

      it('produces one annotation and no transactions', () =>
        assert.jsonSchema(compilationResult, createCompilationResultSchema({
          annotations: 1,
          transactions: 0
        }))
      );
      return it('produces error from parser', () =>
        assert.jsonSchema(compilationResult.annotations[0], createAnnotationSchema({
          type: 'error',
          component: 'apiDescriptionParser'
        }))
      );
    })
  );

  describe('causing an error in URI expansion', () =>
    // Parsers may provide warning in similar situations, however, we do not
    // want to rely on them (implementations differ). This error is returned
    // in case Dredd Transactions are not able to parse the URI template.
    // Mind that situations when parser gives the warning and when this error
    // is thrown can differ and also the severity is different.

    fixtures.uriExpansionAnnotation.forEachDescribe(function({source}) {
      let compilationResult = undefined;

      before(done =>
        compileFixture(source, function(...args) {
          let err;
          [err, compilationResult] = Array.from(args);
          return done(err);
        })
      );

      it('produces some annotations and no transactions', () =>
        assert.jsonSchema(compilationResult, createCompilationResultSchema({
          annotations: [1, 2],
          transactions: 0
        }))
      );
      return it('produces maximum one warning from parser and exactly one error from URI expansion', function() {
        const warning = createAnnotationSchema({
          type: 'warning',
          component: 'apiDescriptionParser'
        });
        const error = createAnnotationSchema({
          type: 'error',
          component: 'uriTemplateExpansion',
          message: /failed to parse uri template/i
        });
        return assert.jsonSchema(compilationResult.annotations, {
          oneOf: [
            {type: 'array', items: [warning, error]},
            {type: 'array', items: [error]}
          ]
        }
        );
      });
    })
  );

  describe('causing an error in URI parameters validation', () =>
    // Parsers may provide warning in similar situations, however, we do not
    // want to rely on them (implementations differ). This error is returned
    // in case Dredd Transactions are not satisfied with the input for
    // expanding the URI template. Mind that situations when parser gives
    // the warning and when this error is returned can differ and also
    // the severity is different.

    fixtures.uriValidationAnnotation.forEachDescribe(function({source}) {
      let compilationResult = undefined;

      before(done =>
        compileFixture(source, function(...args) {
          let err;
          [err, compilationResult] = Array.from(args);
          return done(err);
        })
      );

      it('produces some annotations and no transactions', () =>
        assert.jsonSchema(compilationResult, createCompilationResultSchema({
          annotations: [2, 3],
          transactions: 0
        }))
      );
      return it('produces maximum one warning from parser, exactly one warning from URI expansion, and exactly one error from URI parameters validation', function() {
        const parserWarning = createAnnotationSchema({
          type: 'warning',
          component: 'apiDescriptionParser'
        });
        const uriExpansionWarning = createAnnotationSchema({
          type: 'warning',
          component: 'uriTemplateExpansion'
        });
        const uriValidationError = createAnnotationSchema({
          type: 'error',
          component: 'parametersValidation',
          message: 'no example'
        });
        return assert.jsonSchema(compilationResult.annotations, {
          oneOf: [
            {type: 'array', items: [parserWarning, uriValidationError, uriExpansionWarning]},
            {type: 'array', items: [uriValidationError, uriExpansionWarning]}
          ]
        }
        );
      });
    })
  );

  describe('causing a warning in the parser', () =>
    fixtures.parserWarning.forEachDescribe(function({source}) {
      let compilationResult = undefined;

      before(done =>
        compileFixture(source, function(...args) {
          let err;
          [err, compilationResult] = Array.from(args);
          return done(err);
        })
      );

      it('produces some annotations and one transaction', () =>
        assert.jsonSchema(compilationResult, createCompilationResultSchema({
          annotations: [1],
          transactions: 1
        }))
      );
      return context('the annotations', function() {
        it('are warnings', () =>
          Array.from(compilationResult.annotations).map((ann) =>
            assert.equal(ann.type, 'warning'))
        );
        return it('come from parser', () =>
          Array.from(compilationResult.annotations).map((ann) =>
            assert.equal(ann.component, 'apiDescriptionParser'))
        );
      });
    })
  );

  describe('causing a warning in URI expansion', function() {
    // This is a test for an arbitrary warning coming from URI expansion, which
    // doesn't have any other special side effect. Since there are no such
    // warnings as of now (but were in the past and could be in the future),
    // we need to pretend it's possible in this test.

    const warnings = undefined;
    const transactions = undefined;
    const message = '... dummy warning message ...';

    const stubs = {
      './compile-uri': proxyquire('../../src/compile-uri', {
        './expand-uri-template'(...args) {
          return {uri: '/honey?beekeeper=Honza', errors: [], warnings: [message]};
        }
      }
      )
    };

    return fixtures.ordinary.forEachDescribe(function({source}) {
      let compilationResult = undefined;

      before(done =>
        compileFixture(source, {stubs}, function(...args) {
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
      return it('produces warnings from URI expansion', () =>
        assert.jsonSchema(compilationResult.annotations, {
          type: 'array',
          items: createAnnotationSchema({
            type: 'warning',
            component: 'uriTemplateExpansion',
            message
          })
        }
        )
      );
    });
  });

  describe('causing an \'ambiguous parameters\' warning in URI expansion', () =>
    // Parsers may provide error in similar situations, however, we do not
    // want to rely on them (implementations differ). This warning is returned
    // in case parameters do not have any kind of value Dredd could use. Mind
    // that situations when parser gives the error and when this warning is
    // returned can differ and also the severity is different.
    //
    // Special side effect of the warning is that affected transactions
    // should be skipped (shouldn't appear in output of the compilation).

    fixtures.ambiguousParametersAnnotation.forEachDescribe(function({source}) {
      let compilationResult = undefined;

      before(done =>
        compileFixture(source, function(...args) {
          let err;
          [err, compilationResult] = Array.from(args);
          return done(err);
        })
      );

      it('produces two annotations and no transactions', () =>
        assert.jsonSchema(compilationResult, createCompilationResultSchema({
          annotations: 2,
          transactions: 0
        }))
      );
      return it('produces one warning from URI expansion and one error from URI parameters validation', () =>
        assert.jsonSchema(compilationResult.annotations, {
          type: 'array',
          items: [
            createAnnotationSchema({type: 'error', component: 'parametersValidation'}),
            createAnnotationSchema({type: 'warning', component: 'uriTemplateExpansion'})
          ]
        }
        )
      );
    })
  );

  describe('causing a warning in URI parameters validation', function() {
    // Since 'validateParams' doesn't actually return any warnings
    // (but could in the future), we need to pretend it's possible for this
    // test.

    const message = '... dummy warning message ...';
    const stubs = {
      './compile-uri': proxyquire('../../src/compile-uri', {
        './validate-params'(...args) {
          return {errors: [], warnings: [message]};
        }
      }
      )
    };

    return fixtures.ordinary.forEachDescribe(function({source}) {
      let compilationResult = undefined;

      before(done =>
        compileFixture(source, {stubs}, function(...args) {
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
      return it('produces warnings from URI parameters validation', () =>
        assert.jsonSchema(compilationResult.annotations, {
          type: 'array',
          items: createAnnotationSchema({
            type: 'warning',
            component: 'parametersValidation',
            message
          })
        }
        )
      );
    });
  });

  describe('with enum parameter', () =>
    fixtures.enumParameter.forEachDescribe(function({source}) {
      let compilationResult = undefined;

      before(done =>
        compileFixture(source, function(...args) {
          let err;
          [err, compilationResult] = Array.from(args);
          return done(err);
        })
      );

      it('produces one transaction', () =>
        assert.jsonSchema(compilationResult, createCompilationResultSchema({
          transactions: 1
        }))
      );
      return it('expands the request URI with the first enum value', () => assert.equal(compilationResult.transactions[0].request.uri, '/honey?beekeeper=Adam'));
    })
  );

  describe('with enum parameter having example value', () =>
    fixtures.enumParameterExample.forEachDescribe(function({source}) {
      let compilationResult = undefined;

      before(done =>
        compileFixture(source, function(...args) {
          let err;
          [err, compilationResult] = Array.from(args);
          return done(err);
        })
      );

      it('produces one transaction', () =>
        assert.jsonSchema(compilationResult, createCompilationResultSchema({
          transactions: 1
        }))
      );
      return it('expands the request URI with the example value', () => assert.equal(compilationResult.transactions[0].request.uri, '/honey?beekeeper=Honza'));
    })
  );

  describe('with enum parameter having unlisted example value', () =>
    // Parsers may provide warning in similar situations, however, we do not
    // want to rely on them (implementations differ). This error is returned
    // in case enum parameters have an example value, which is not allowed
    // by the enum. Mind that situations when parser gives the warning and
    // when this error is returned can differ and also the severity is different.

    fixtures.enumParameterUnlistedExample.forEachDescribe(function({source}) {
      let compilationResult = undefined;

      before(done =>
        compileFixture(source, function(...args) {
          let err;
          [err, compilationResult] = Array.from(args);
          return done(err);
        })
      );

      it('produces some annotations and one transaction', () =>
        assert.jsonSchema(compilationResult, createCompilationResultSchema({
          annotations: [1, 2],
          transactions: 1
        }))
      );
      it('produces maximum one warning from parser, and exactly one error from URI parameters validation', function() {
        const warning = createAnnotationSchema({
          type: 'warning',
          component: 'apiDescriptionParser'
        });
        const error = createAnnotationSchema({
          type: 'error',
          component: 'parametersValidation',
          message: 'example value is not one of enum values'
        });
        return assert.jsonSchema(compilationResult.annotations, {
          oneOf: [
            {type: 'array', items: [warning, error]},
            {type: 'array', items: [error]}
          ]
        }
        );
      });
      return it('expands the request URI with the example value', () => assert.equal(compilationResult.transactions[0].request.uri, '/honey?beekeeper=Pavan'));
    })
  );

  describe('with parameters having example values', () =>
    fixtures.exampleParameters.forEachDescribe(function({source}) {
      let compilationResult = undefined;

      before(done =>
        compileFixture(source, function(...args) {
          let err;
          [err, compilationResult] = Array.from(args);
          return done(err);
        })
      );

      it('produces one transaction', () =>
        assert.jsonSchema(compilationResult, createCompilationResultSchema({
          transactions: 1
        }))
      );
      return it('expands the request URI with the example value', () => assert.equal(compilationResult.transactions[0].request.uri, '/honey?beekeeper=Honza&flavour=spicy'));
    })
  );

  describe('with response schema', () =>
    fixtures.responseSchema.forEachDescribe(function({source}) {
      let compilationResult = undefined;

      before(done =>
        compileFixture(source, function(...args) {
          let err;
          [err, compilationResult] = Array.from(args);
          return done(err);
        })
      );

      it('produces one transaction', () =>
        assert.jsonSchema(compilationResult, createCompilationResultSchema({
          transactions: 2
        }))
      );
      context('the first transaction', function() {
        it('has the body in response data', function() {
          assert.ok(compilationResult.transactions[0].response.body);
          return assert.doesNotThrow( () => JSON.parse(compilationResult.transactions[0].response.body));
        });
        return it('has the schema in response data', function() {
          assert.ok(compilationResult.transactions[0].response.schema);
          return assert.doesNotThrow( () => JSON.parse(compilationResult.transactions[0].response.schema));
        });
      });
      return context('the second transaction', function() {
        it('has no body in response data', () => assert.notOk(compilationResult.transactions[1].response.body));
        return it('has the schema in response data', function() {
          assert.ok(compilationResult.transactions[1].response.schema);
          return assert.doesNotThrow( () => JSON.parse(compilationResult.transactions[1].response.schema));
        });
      });
    })
  );

  describe('with inheritance of URI parameters', () =>
    fixtures.parametersInheritance.forEachDescribe(function({source}) {
      let compilationResult = undefined;

      before(done =>
        compileFixture(source, function(...args) {
          let err;
          [err, compilationResult] = Array.from(args);
          return done(err);
        })
      );

      it('produces one transaction', () =>
        assert.jsonSchema(compilationResult, createCompilationResultSchema({
          transactions: 1
        }))
      );
      return it('expands the request URI using correct inheritance cascade', () => assert.equal(compilationResult.transactions[0].request.uri, '/honey?beekeeper=Honza&amount=42'));
    })
  );

  describe('with different default value and first enum value of URI parameter', () =>
    fixtures.preferDefault.forEachDescribe(function({source}) {
      let compilationResult = undefined;

      before(done =>
        compileFixture(source, function(...args) {
          let err;
          [err, compilationResult] = Array.from(args);
          return done(err);
        })
      );

      it('produces one transaction', () =>
        assert.jsonSchema(compilationResult, createCompilationResultSchema({
          transactions: 1
        }))
      );
      return it('expands the request URI using the default value', () => assert.equal(compilationResult.transactions[0].request.uri, '/honey?beekeeper=Adam'));
    })
  );

  describe('with default value for a required URI parameter', () =>
    fixtures.defaultRequired.forEachDescribe(function({source}) {
      let compilationResult = undefined;

      before(done =>
        compileFixture(source, function(...args) {
          let err;
          [err, compilationResult] = Array.from(args);
          return done(err);
        })
      );

      it('produces some annotations and one transaction', () =>
        assert.jsonSchema(compilationResult, createCompilationResultSchema({
          annotations: [1, 2],
          transactions: 1
        }))
      );
      it('produces maximum one warning from parser, and exactly one warning from URI expansion', function() {
        const parserWarning = createAnnotationSchema({
          type: 'warning',
          component: 'apiDescriptionParser'
        });
        const uriExpansionWarning = createAnnotationSchema({
          type: 'warning',
          component: 'uriTemplateExpansion',
          message: /default value for a required parameter/i
        });
        return assert.jsonSchema(compilationResult.annotations, {
          oneOf: [
            {type: 'array', items: [parserWarning, uriExpansionWarning]},
            {type: 'array', items: [uriExpansionWarning]}
          ]
        }
        );
      });
      return it('expands the request URI using the default value', () => assert.equal(compilationResult.transactions[0].request.uri, '/honey?beekeeper=Honza'));
    })
  );

  describe('with HTTP headers', () =>
    fixtures.httpHeaders.forEachDescribe(function({source}) {
      let compilationResult = undefined;

      before(done =>
        compileFixture(source, function(...args) {
          let err;
          [err, compilationResult] = Array.from(args);
          return done(err);
        })
      );

      it('produces one transaction', () =>
        assert.jsonSchema(compilationResult, createCompilationResultSchema({
          transactions: 1
        }))
      );
      it('produces expected request headers', () =>
        assert.deepEqual(compilationResult.transactions[0].request.headers, [
          {name: 'Content-Type', value: 'application/json'},
          {name: 'Accept', value: 'application/json'}
        ])
      );
      return it('produces expected response headers', () =>
        assert.deepEqual(compilationResult.transactions[0].response.headers, [
          {name: 'Content-Type', value: 'application/json'},
          {name: 'X-Test', value: 'Adam'}
        ])
      );
    })
  );

  describe('without explicit body', () =>
    fixtures.noBody.forEachDescribe(function({source}) {
      let compilationResult = undefined;

      before(done =>
        compileFixture(source, function(...args) {
          let err;
          [err, compilationResult] = Array.from(args);
          return done(err);
        })
      );

      it('produces 2 transactions', () =>
        assert.jsonSchema(compilationResult, createCompilationResultSchema({
          transactions: 2
        }))
      );
      it('produces transaction #1 with no body', () => assert.isUndefined(compilationResult.transactions[0].response.body));
      return it('produces transaction #2 with no body', () => assert.isUndefined(compilationResult.transactions[0].response.body));
    })
  );

  return describe('without explicit schema', () =>
    fixtures.noSchema.forEachDescribe(function({source}) {
      let compilationResult = undefined;
      const expectedMediaTypes = ['application/json', 'application/json', 'text/csv', 'text/yaml'];

      before(done =>
        compileFixture(source, function(...args) {
          let err;
          [err, compilationResult] = Array.from(args);
          return done(err);
        })
      );

      it(`produces ${expectedMediaTypes.length} transactions`, () =>
        assert.jsonSchema(compilationResult, createCompilationResultSchema({
          transactions: expectedMediaTypes.length
        }))
      );
      return expectedMediaTypes.forEach((mediaType, i) =>
        context(`transaction #${i + 1}`, function() {
          it(`has '${mediaType}' response`, () =>
            assert.deepEqual(compilationResult.transactions[i].response.headers, [
              {name: 'Content-Type', value: mediaType}
            ])
          );
          return it('has no schema', () => assert.isUndefined(compilationResult.transactions[i].response.schema));
        })
      );
    })
  );
});
