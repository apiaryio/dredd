const sinon = require('sinon');

const createAnnotationSchema = require('../schemas/annotation');
const createCompilationResultSchema = require('../schemas/compilation-result');
const detectTransactionExampleNumbers = require('../../lib/detect-transaction-example-numbers');
const fixtures = require('../fixtures');

const { assert, compileFixture } = require('../utils');

describe('compile() · Swagger', () => {
  describe('causing a \'not specified in URI Template\' error', () => {
    let compilationResult;

    before(done =>
      compileFixture(fixtures.notSpecifiedInUriTemplateAnnotation.swagger, (...args) => {
        let err;
        [err, compilationResult] = Array.from(args); // eslint-disable-line
        done(err);
      })
    );

    it('produces one annotation and no transactions', () =>
      assert.jsonSchema(compilationResult, createCompilationResultSchema({
        annotations: 1,
        transactions: 0
      }))
    );

    it('produces error about parameter not being in the URI Template', () =>
      assert.jsonSchema(compilationResult.annotations[0], createAnnotationSchema({
        type: 'error',
        component: 'apiDescriptionParser',
        message: /no corresponding.+in the path string/
      }))
    );
  });

  describe('with \'produces\' containing JSON media type', () => {
    let compilationResult;

    before(done =>
      compileFixture(fixtures.produces.swagger, (...args) => {
        let err;
        [err, compilationResult] = Array.from(args); // eslint-disable-line
        done(err);
      })
    );

    it('produces two transactions', () =>
      assert.jsonSchema(compilationResult, createCompilationResultSchema({
        transactions: 2
      }))
    );

    [
      { accept: 'application/json', contentType: 'application/json' },
      { accept: 'application/json', contentType: 'text/plain' }
    ].forEach(({ accept, contentType }, i) =>
      context(`compiles a transaction for the '${contentType}' media type`, () => {
        it('with expected request headers', () =>
          assert.deepEqual(compilationResult.transactions[i].request.headers, [
            { name: 'Accept', value: accept }
          ])
        );

        it('with expected response headers', () =>
          assert.deepEqual(compilationResult.transactions[i].response.headers, [
            { name: 'Content-Type', value: contentType }
          ])
        );
      })
    );
  });

  describe('with \'produces\' containing JSON media type with parameters', () => {
    let compilationResult;

    before(done =>
      compileFixture(fixtures.producesCharset.swagger, (...args) => {
        let err;
        [err, compilationResult] = Array.from(args); // eslint-disable-line
        done(err);
      })
    );

    it('produces two transactions', () =>
      assert.jsonSchema(compilationResult, createCompilationResultSchema({
        transactions: 2
      }))
    );

    [
      { accept: 'application/json; charset=utf-8', contentType: 'application/json; charset=utf-8' },
      { accept: 'application/json; charset=utf-8', contentType: 'text/plain' }
    ].forEach((mediaTypes, i) =>
      context(`compiles transaction #${i}`, () => {
        it('with expected request headers', () =>
          assert.deepEqual(compilationResult.transactions[i].request.headers, [
            { name: 'Accept', value: mediaTypes.accept }
          ])
        );

        it('with expected response headers', () =>
          assert.deepEqual(compilationResult.transactions[i].response.headers, [
            { name: 'Content-Type', value: mediaTypes.contentType }
          ])
        );
      })
    );
  });

  describe('with \'produces\' containing a non-JSON media type with an example', () => {
    let compilationResult;

    before(done =>
      compileFixture(fixtures.producesNonJSONExample.swagger, (...args) => {
        let err;
        [err, compilationResult] = Array.from(args); // eslint-disable-line
        done(err);
      })
    );

    it('produces two transactions', () =>
      assert.jsonSchema(compilationResult, createCompilationResultSchema({
        transactions: 2
      }))
    );

    [
      { accept: 'application/json', contentType: 'application/json' },
      { accept: 'text/plain', contentType: 'text/plain' }
    ].forEach((mediaTypes, i) =>
      context(`compiles transaction #${i}`, () => {
        it('with expected request headers', () =>
          assert.deepEqual(compilationResult.transactions[i].request.headers, [
            { name: 'Accept', value: mediaTypes.accept }
          ])
        );

        it('with expected response headers', () =>
          assert.deepEqual(compilationResult.transactions[i].response.headers, [
            { name: 'Content-Type', value: mediaTypes.contentType }
          ])
        );
      })
    );
  });

  describe('with \'consumes\'', () => {
    let compilationResult;

    before(done =>
      compileFixture(fixtures.consumes.swagger, (...args) => {
        let err;
        [err, compilationResult] = Array.from(args); // eslint-disable-line
        done(err);
      })
    );

    it('produces two transactions', () =>
      assert.jsonSchema(compilationResult, createCompilationResultSchema({
        transactions: 3
      }))
    );

    ['application/json', 'application/xml', 'application/json'].forEach((mediaType, i) =>
      context(`compiles a transaction for the '${mediaType}' media type`, () => {
        it('with expected request headers', () =>
          assert.deepEqual(compilationResult.transactions[i].request.headers, [
            { name: 'Content-Type', value: mediaType }
          ])
        );

        it('with expected response headers', () => assert.deepEqual(compilationResult.transactions[i].response.headers, []));
      })
    );
  });

  describe('with multiple responses', () => {
    let compilationResult;
    const filename = 'apiDescription.json';
    const detectTransactionExampleNumbersStub = sinon.spy(detectTransactionExampleNumbers);
    const expectedStatusCodes = [200, 400, 500];

    before((done) => {
      const stubs = { './detect-transaction-example-numbers': detectTransactionExampleNumbersStub };
      compileFixture(fixtures.multipleResponses.swagger, { filename, stubs }, (...args) => {
        let err;
        [err, compilationResult] = Array.from(args); // eslint-disable-line
        done(err);
      });
    });

    it('does not call the detection of transaction examples', () => assert.isFalse(detectTransactionExampleNumbersStub.called));

    it(`produces ${expectedStatusCodes.length} transactions`, () =>
      assert.jsonSchema(compilationResult, createCompilationResultSchema({
        transactions: expectedStatusCodes.length
      }))
    );

    it('skips non-JSON media types in \'produces\'', () =>
      compilationResult.transactions.forEach((transaction) => {
        const contentType = transaction.response.headers
          .filter(header => header.name.toLowerCase() === 'content-type')
          .map(header => header.value)[0];
        assert.equal(contentType, 'application/json');
      })
    );

    Array.from(expectedStatusCodes).map((statusCode, i) =>
      context(`origin of transaction #${i + 1}`, () => {
        it('uses URI as resource name', () => assert.equal(compilationResult.transactions[i].origin.resourceName, '/honey'));

        it('uses method as action name', () => assert.equal(compilationResult.transactions[i].origin.actionName, 'GET'));

        it('uses status code and response\'s Content-Type as example name', () =>
          assert.equal(
            compilationResult.transactions[i].origin.exampleName,
            `${statusCode} > application/json`
          )
        );
      }));
  });

  describe('with \'securityDefinitions\' and multiple responses', () => {
    let compilationResult;

    before(done =>
      compileFixture(fixtures.securityDefinitionsMultipleResponses.swagger, (...args) => {
        let err;
        [err, compilationResult] = Array.from(args); // eslint-disable-line
        done(err);
      })
    );

    it('produces two transactions', () =>
      assert.jsonSchema(compilationResult, createCompilationResultSchema({
        transactions: 2
      }))
    );
  });

  describe('with \'securityDefinitions\' containing transitions', () => {
    let compilationResult;

    before(done =>
      compileFixture(fixtures.securityDefinitionsTransitions.swagger, (...args) => {
        let err;
        [err, compilationResult] = Array.from(args); // eslint-disable-line
        done(err);
      })
    );

    it('produces one transaction', () =>
      assert.jsonSchema(compilationResult, createCompilationResultSchema({
        transactions: 1
      }))
    );
  });

  describe('with default response (without explicit status code)', () => {
    let compilationResult;

    before(done =>
      compileFixture(fixtures.defaultResponse.swagger, (...args) => {
        let err;
        [err, compilationResult] = Array.from(args); // eslint-disable-line
        done(err);
      })
    );

    it('produces two annotations and two transactions', () =>
      assert.jsonSchema(compilationResult, createCompilationResultSchema({
        annotations: 2,
        transactions: 2
      }))
    );

    it('produces warnings about the default response being unsupported', () =>
      assert.jsonSchema(compilationResult.annotations, {
        type: 'array',
        items: createAnnotationSchema({
          type: 'warning',
          component: 'apiDescriptionParser',
          message: 'Default response is not yet supported'
        })
      })
    );

    it('assumes the solitary default response to be HTTP 200', () => assert.equal(compilationResult.transactions[0].response.status, '200'));
    it('ignores non-solitary default response, propagates only HTTP 204', () => assert.equal(compilationResult.transactions[1].response.status, '204'));
  });
});
