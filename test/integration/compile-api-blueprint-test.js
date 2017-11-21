
const proxyquire = require('proxyquire').noPreserveCache();
const sinon = require('sinon');

const fixtures = require('../fixtures');
const {assert, compileFixture} = require('../utils');
const createCompilationResultSchema = require('../schemas/compilation-result');
const createAnnotationSchema = require('../schemas/annotation');


describe('compile() · API Blueprint', function() {
  describe('causing a \'missing title\' warning', function() {
    let compilationResult = undefined;

    before(done =>
      compileFixture(fixtures.missingTitleAnnotation.apiBlueprint, function(...args) {
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
    return it('produces warning about missing title', () =>
      assert.jsonSchema(compilationResult.annotations[0], createAnnotationSchema({
        type: 'warning',
        component: 'apiDescriptionParser',
        message: 'expected API name'
      }))
    );
  });

  describe('causing a \'not found within URI Template\' warning', function() {
    // The warning was previously handled by compiler, but now parser should
    // already provide the same kind of warning.

    let compilationResult = undefined;

    before(done =>
      compileFixture(fixtures.notSpecifiedInUriTemplateAnnotation.apiBlueprint, function(...args) {
        let err;
        [err, compilationResult] = Array.from(args);
        return done(err);
      })
    );

    it('produces one annotation and one transaction', () =>
      assert.jsonSchema(compilationResult, createCompilationResultSchema({
        annotations: 1,
        transactions: 1
      }))
    );
    return it('produces warning about parameter not being in the URI Template', () =>
      assert.jsonSchema(compilationResult.annotations[0], createAnnotationSchema({
        type: 'warning',
        component: 'apiDescriptionParser',
        message: /not found within.+uri template/i
      }))
    );
  });

  describe('with multiple transaction examples', function() {
    const detectTransactionExampleNumbers = sinon.spy(require('../../src/detect-transaction-example-numbers'));
    let compilationResult = undefined;
    const expected = [
      {exampleName: '', requestContentType: 'application/json', responseStatusCode: 200},
      {exampleName: 'Example 1', requestContentType: 'application/json', responseStatusCode: 200},
      {exampleName: 'Example 2', requestContentType: 'text/plain', responseStatusCode: 415}
    ];

    before(function(done) {
      const stubs = {'./detect-transaction-example-numbers': detectTransactionExampleNumbers};
      return compileFixture(fixtures.multipleTransactionExamples.apiBlueprint, {stubs}, function(...args) {
        let err;
        [err, compilationResult] = Array.from(args);
        return done(err);
      });
    });

    it('calls the detection of transaction examples', () => assert.isTrue(detectTransactionExampleNumbers.called));
    it(`produces ${expected.length} transactions`, () =>
      assert.jsonSchema(compilationResult, createCompilationResultSchema({
        transactions: expected.length
      }))
    );
    return Array.from(expected).map((expectations, i) =>
      ((expectations, i) =>
        context(`transaction #${i + 1}`, function() {
          const {exampleName, requestContentType, responseStatusCode} = expectations;

          it(`is identified as part of ${JSON.stringify(exampleName)}`, () =>
            assert.equal(
              compilationResult.transactions[i].origin.exampleName,
              exampleName
            )
          );
          it(`has request with Content-Type: ${requestContentType}`, function() {
            const { headers } = compilationResult.transactions[i].request;
            const contentType = headers
              .filter(header => header.name === 'Content-Type')
              .map(header => header.value)[0];
            return assert.equal(contentType, requestContentType);
          });
          return it(`has response with status code ${responseStatusCode}`, () =>
            assert.equal(
              compilationResult.transactions[i].response.status,
              responseStatusCode
            )
          );
        })
      )(expectations, i));
  });

  describe('without multiple transaction examples', function() {
    const detectTransactionExampleNumbers = sinon.spy(require('../../src/detect-transaction-example-numbers'));
    let compilationResult = undefined;

    before(function(done) {
      const stubs = {'./detect-transaction-example-numbers': detectTransactionExampleNumbers};
      return compileFixture(fixtures.oneTransactionExample.apiBlueprint, {stubs}, function(...args) {
        let err;
        [err, compilationResult] = Array.from(args);
        return done(err);
      });
    });

    it('calls the detection of transaction examples', () => assert.isTrue(detectTransactionExampleNumbers.called));
    it('produces one transaction', () =>
      assert.jsonSchema(compilationResult, createCompilationResultSchema({
        transactions: 1
      }))
    );
    return context('the transaction', function() {
      it("is identified as part of no example in \'origin\'", () => assert.equal(compilationResult.transactions[0].origin.exampleName, ''));
      return it("is identified as part of Example 1 in \'pathOrigin\'", () => assert.equal(compilationResult.transactions[0].pathOrigin.exampleName, 'Example 1'));
    });
  });

  describe('with arbitrary action', function() {
    let compilationResult = undefined;
    const filename = 'apiDescription.apib';

    before(done =>
      compileFixture(fixtures.arbitraryAction.apiBlueprint, {filename}, function(...args) {
        let err;
        [err, compilationResult] = Array.from(args);
        return done(err);
      })
    );

    it('produces two transactions', () =>
      assert.jsonSchema(compilationResult, createCompilationResultSchema({
        transactions: 2
      }))
    );
    context('the action within a resource', function() {
      it('has URI inherited from the resource', () => assert.equal(compilationResult.transactions[0].request.uri, '/resource/1'));
      return it('has its method', () => assert.equal(compilationResult.transactions[0].request.method, 'GET'));
    });
    return context('the arbitrary action', function() {
      it('has its own URI', () => assert.equal(compilationResult.transactions[1].request.uri, '/arbitrary/sample'));
      return it('has its method', () => assert.equal(compilationResult.transactions[1].request.method, 'POST'));
    });
  });

  describe('without sections', function() {
    let compilationResult = undefined;
    const filename = 'apiDescription.apib';

    before(done =>
      compileFixture(fixtures.withoutSections.apiBlueprint, {filename}, function(...args) {
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
    context('\'origin\'', function() {
      it('uses filename as API name', () => assert.equal(compilationResult.transactions[0].origin.apiName, filename));
      it('uses empty string as resource group name', () => assert.equal(compilationResult.transactions[0].origin.resourceGroupName, ''));
      it('uses URI as resource name', () => assert.equal(compilationResult.transactions[0].origin.resourceName, '/message'));
      return it('uses method as action name', () => assert.equal(compilationResult.transactions[0].origin.actionName, 'GET'));
    });
    return context('\'pathOrigin\'', function() {
      it('uses empty string as API name', () => assert.equal(compilationResult.transactions[0].pathOrigin.apiName, ''));
      it('uses empty string as resource group name', () => assert.equal(compilationResult.transactions[0].pathOrigin.resourceGroupName, ''));
      it('uses URI as resource name', () => assert.equal(compilationResult.transactions[0].pathOrigin.resourceName, '/message'));
      return it('uses method as action name', () => assert.equal(compilationResult.transactions[0].pathOrigin.actionName, 'GET'));
    });
  });

  describe('with different sample and default value of URI parameter', function() {
    let compilationResult = undefined;

    before(done =>
      compileFixture(fixtures.preferSample.apiBlueprint, function(...args) {
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
    return it('expands the request URI using the sample value', () => assert.equal(compilationResult.transactions[0].request.uri, '/honey?beekeeper=Pavan'));
  });

  describe('with response without explicit status code', function() {
    let compilationResult = undefined;

    before(done =>
      compileFixture(fixtures.noStatus.apiBlueprint, function(...args) {
        let err;
        [err, compilationResult] = Array.from(args);
        return done(err);
      })
    );

    it('produces 1 annotation and 1 transaction', () =>
      assert.jsonSchema(compilationResult, createCompilationResultSchema({
        annotations: 1,
        transactions: 1
      }))
    );
    it('produces warning about the response status code being assumed', () =>
      assert.jsonSchema(compilationResult.annotations[0], createAnnotationSchema({
        type: 'warning',
        component: 'apiDescriptionParser',
        message: 'missing response HTTP status code, assuming'
      }))
    );
    return it('assumes HTTP 200', () => assert.equal(compilationResult.transactions[0].response.status, '200'));
  });

  return describe('with multiple HTTP headers of the same name', function() {
    let compilationResult = undefined;

    before(done =>
      compileFixture(fixtures.httpHeadersMultiple.apiBlueprint, function(...args) {
        let err;
        [err, compilationResult] = Array.from(args);
        return done(err);
      })
    );

    it('produces 1 annotation and 1 transaction', () =>
      assert.jsonSchema(compilationResult, createCompilationResultSchema({
        annotations: 1,
        transactions: 1
      }))
    );
    it('produces warning about duplicate header names', () =>
      assert.jsonSchema(compilationResult.annotations[0], createAnnotationSchema({
        type: 'warning',
        component: 'apiDescriptionParser',
        message: /duplicate definition.+header/
      }))
    );
    return context('the transaction', function() {
      it('has the expected request headers', () =>
        assert.deepEqual(compilationResult.transactions[0].request.headers, [
          {name: 'Content-Type', value: 'application/json'},
          {name: 'X-Multiple', value: 'foo'},
          {name: 'X-Multiple', value: 'bar'}
        ])
      );
      return it('has the expected response headers', () =>
        assert.deepEqual(compilationResult.transactions[0].response.headers, [
          {name: 'Content-Type', value: 'application/json'},
          {name: 'Set-Cookie', value: 'session-id=123'},
          {name: 'Set-Cookie', value: 'likes-honey=true'}
        ])
      );
    });
  });
});
