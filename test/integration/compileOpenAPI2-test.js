const sinon = require('sinon');
const proxyquire = require('proxyquire');

const createAnnotationSchema = require('../schemas/createAnnotationSchema');
const createCompileResultSchema = require('../schemas/createCompileResultSchema');
const detectTransactionExampleNumbers = require('../../lib/detectTransactionExampleNumbers');

const { assert, fixtures } = require('../support');
const compile = require('../../lib/compile');


describe('compile() · OpenAPI 2', () => {
  describe('causing a \'not specified in URI Template\' error', () => {
    const { mediaType, apiElements } = fixtures('not-specified-in-uri-template-annotation').openapi2;
    const compileResult = compile(mediaType, apiElements);

    it('produces one annotation and no transactions', () => {
      assert.jsonSchema(compileResult, createCompileResultSchema({
        annotations: 1,
        transactions: 0,
      }));
    });
    it('produces error about parameter not being in the URI Template', () => {
      assert.jsonSchema(compileResult.annotations[0], createAnnotationSchema({
        type: 'error',
        component: 'apiDescriptionParser',
        message: /no corresponding.+in the path string/,
      }));
    });
  });

  describe('with \'produces\' containing JSON media type', () => {
    const { mediaType, apiElements } = fixtures('produces').openapi2;
    const compileResult = compile(mediaType, apiElements);

    it('produces two transactions', () => {
      assert.jsonSchema(compileResult, createCompileResultSchema({
        transactions: 2,
      }));
    });

    [
      { accept: 'application/json', contentType: 'application/json' },
      { accept: 'application/json', contentType: 'text/plain' },
    ].forEach(({ accept, contentType }, i) => context(`compiles a transaction for the '${contentType}' media type`, () => {
      it('with expected request headers', () => {
        assert.deepEqual(compileResult.transactions[i].request.headers, [
          { name: 'Accept', value: accept },
        ]);
      });
      it('with expected response headers', () => {
        assert.deepEqual(compileResult.transactions[i].response.headers, [
          { name: 'Content-Type', value: contentType },
        ]);
      });
    }));
  });

  describe('with \'produces\' containing JSON media type with parameters', () => {
    const { mediaType, apiElements } = fixtures('produces-charset').openapi2;
    const compileResult = compile(mediaType, apiElements);

    it('produces two transactions', () => {
      assert.jsonSchema(compileResult, createCompileResultSchema({
        transactions: 2,
      }));
    });

    [
      { accept: 'application/json; charset=utf-8', contentType: 'application/json; charset=utf-8' },
      { accept: 'application/json; charset=utf-8', contentType: 'text/plain' },
    ].forEach((mediaTypes, i) => context(`compiles transaction #${i}`, () => {
      it('with expected request headers', () => {
        assert.deepEqual(compileResult.transactions[i].request.headers, [
          { name: 'Accept', value: mediaTypes.accept },
        ]);
      });
      it('with expected response headers', () => {
        assert.deepEqual(compileResult.transactions[i].response.headers, [
          { name: 'Content-Type', value: mediaTypes.contentType },
        ]);
      });
    }));
  });

  describe('with \'produces\' containing a non-JSON media type with an example', () => {
    const { mediaType, apiElements } = fixtures('produces-non-json-example').openapi2;
    const compileResult = compile(mediaType, apiElements);

    it('produces two transactions', () => {
      assert.jsonSchema(compileResult, createCompileResultSchema({
        transactions: 2,
      }));
    });

    [
      { accept: 'application/json', contentType: 'application/json' },
      { accept: 'text/plain', contentType: 'text/plain' },
    ].forEach((mediaTypes, i) => context(`compiles transaction #${i}`, () => {
      it('with expected request headers', () => {
        assert.deepEqual(compileResult.transactions[i].request.headers, [
          { name: 'Accept', value: mediaTypes.accept },
        ]);
      });
      it('with expected response headers', () => {
        assert.deepEqual(compileResult.transactions[i].response.headers, [
          { name: 'Content-Type', value: mediaTypes.contentType },
        ]);
      });
    }));
  });

  describe('with \'consumes\'', () => {
    const { mediaType, apiElements } = fixtures('consumes').openapi2;
    const compileResult = compile(mediaType, apiElements);

    it('produces two transactions', () => {
      assert.jsonSchema(compileResult, createCompileResultSchema({
        transactions: 3,
      }));
    });

    ['application/json', 'application/xml', 'application/json'].forEach((contentType, i) => context(`compiles a transaction for the '${contentType}' content type`, () => {
      it('with expected request headers', () => {
        assert.deepEqual(compileResult.transactions[i].request.headers, [
          { name: 'Content-Type', value: contentType },
        ]);
      });
      it('with expected response headers', () => {
        assert.deepEqual(compileResult.transactions[i].response.headers, []);
      });
    }));
  });

  describe('with multiple responses', () => {
    const filename = 'apiDescription.json';
    const detectTransactionExampleNumbersStub = sinon.spy(detectTransactionExampleNumbers);
    const stubbedCompile = proxyquire('../../lib/compile', {
      './detectTransactionExampleNumbers': detectTransactionExampleNumbersStub,
    });
    const { mediaType, apiElements } = fixtures('multiple-responses').openapi2;
    const compileResult = stubbedCompile(mediaType, apiElements, filename);

    const expectedStatusCodes = [200, 400, 500];

    it('does not call the detection of transaction examples', () => {
      assert.isFalse(detectTransactionExampleNumbersStub.called);
    });

    it(`produces ${expectedStatusCodes.length} transactions`, () => {
      assert.jsonSchema(compileResult, createCompileResultSchema({
        transactions: expectedStatusCodes.length,
      }));
    });
    it('skips non-JSON media types in \'produces\'', () => compileResult.transactions.forEach((transaction) => {
      const contentType = transaction.response.headers
        .filter(header => header.name.toLowerCase() === 'content-type')
        .map(header => header.value)[0];
      assert.equal(contentType, 'application/json');
    }));

    Array.from(expectedStatusCodes).map((statusCode, i) => context(`origin of transaction #${i + 1}`, () => {
      it('uses URI as resource name', () => {
        assert.equal(compileResult.transactions[i].origin.resourceName, '/honey');
      });
      it('uses method as action name', () => {
        assert.equal(compileResult.transactions[i].origin.actionName, 'GET');
      });
      it('uses status code and response\'s Content-Type as example name', () => {
        assert.equal(
          compileResult.transactions[i].origin.exampleName,
          `${statusCode} > application/json`
        );
      });
    }));
  });

  describe('with \'securityDefinitions\' and multiple responses', () => {
    const { mediaType, apiElements } = fixtures('security-definitions-multiple-responses').openapi2;
    const compileResult = compile(mediaType, apiElements);

    it('produces two transactions', () => {
      assert.jsonSchema(compileResult, createCompileResultSchema({
        transactions: 2,
      }));
    });
  });

  describe('with \'securityDefinitions\' containing transitions', () => {
    const { mediaType, apiElements } = fixtures('security-definitions-transitions').openapi2;
    const compileResult = compile(mediaType, apiElements);

    it('produces one transaction', () => {
      assert.jsonSchema(compileResult, createCompileResultSchema({
        transactions: 1,
      }));
    });
  });

  describe('with default response (without explicit status code)', () => {
    const { mediaType, apiElements } = fixtures('default-response').openapi2;
    const compileResult = compile(mediaType, apiElements);

    it('produces two annotations and two transactions', () => {
      assert.jsonSchema(compileResult, createCompileResultSchema({
        annotations: 2,
        transactions: 2,
      }));
    });
    it('produces warnings about the default response being unsupported', () => {
      assert.jsonSchema(compileResult.annotations, {
        type: 'array',
        items: createAnnotationSchema({
          type: 'warning',
          component: 'apiDescriptionParser',
          message: 'Default response is not yet supported',
        }),
      });
    });
    it('assumes the solitary default response to be HTTP 200', () => {
      assert.equal(compileResult.transactions[0].response.status, '200');
    });
    it('ignores non-solitary default response, propagates only HTTP 204', () => {
      assert.equal(compileResult.transactions[1].response.status, '204');
    });
  });
});
