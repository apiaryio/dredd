const sinon = require('sinon');
const proxyquire = require('proxyquire').noPreserveCache();

const createAnnotationSchema = require('../schemas/createAnnotationSchema');
const createCompileResultSchema = require('../schemas/createCompileResultSchema');
const detectTransactionExampleNumbers = require('../../lib/detectTransactionExampleNumbers');

const { assert, fixtures } = require('../support');
const compile = require('../../lib/compile');


describe('compile() · API Blueprint', () => {
  describe('causing a \'missing title\' warning', () => {
    const { mediaType, apiElements } = fixtures('missing-title-annotation').apib;
    const compileResult = compile(mediaType, apiElements);

    it('produces one annotation and no transactions', () => {
      assert.jsonSchema(compileResult, createCompileResultSchema({
        annotations: 1,
        transactions: 0,
      }));
    });
    it('produces warning about missing title', () => {
      assert.jsonSchema(compileResult.annotations[0], createAnnotationSchema({
        type: 'warning',
        component: 'apiDescriptionParser',
        message: 'expected API name',
      }));
    });
  });

  describe('causing a \'not found within URI Template\' warning', () => {
    // The warning was previously handled by compiler, but now parser should
    // already provide the same kind of warning.
    const { mediaType, apiElements } = fixtures('not-specified-in-uri-template-annotation').apib;
    const compileResult = compile(mediaType, apiElements);

    it('produces one annotation and one transaction', () => {
      assert.jsonSchema(compileResult, createCompileResultSchema({
        annotations: 1,
        transactions: 1,
      }));
    });
    it('produces warning about parameter not being in the URI Template', () => {
      assert.jsonSchema(compileResult.annotations[0], createAnnotationSchema({
        type: 'warning',
        component: 'apiDescriptionParser',
        message: /not found within.+uri template/i,
      }));
    });
  });

  describe('with multiple transaction examples', () => {
    const detectTransactionExampleNumbersStub = sinon.spy(detectTransactionExampleNumbers);
    const stubbedCompile = proxyquire('../../lib/compile', {
      './detectTransactionExampleNumbers': detectTransactionExampleNumbersStub,
    });
    const { mediaType, apiElements } = fixtures('multiple-transaction-examples').apib;
    const compileResult = stubbedCompile(mediaType, apiElements);

    const expected = [
      { exampleName: '', requestContentType: 'application/json', responseStatusCode: 200 },
      { exampleName: 'Example 1', requestContentType: 'application/json', responseStatusCode: 200 },
      { exampleName: 'Example 2', requestContentType: 'text/plain', responseStatusCode: 415 },
    ];

    it('calls the detection of transaction examples', () => {
      assert.isTrue(detectTransactionExampleNumbersStub.called);
    });
    it(`produces ${expected.length} transactions`, () => {
      assert.jsonSchema(compileResult, createCompileResultSchema({
        transactions: expected.length,
      }));
    });
    Array.from(expected).map((expectations, i) => context(`transaction #${i + 1}`, () => {
      const { exampleName, requestContentType, responseStatusCode } = expectations;

      it(`is identified as part of ${JSON.stringify(exampleName)}`, () => {
        assert.equal(
          compileResult.transactions[i].origin.exampleName,
          exampleName
        );
      });
      it(`has request with Content-Type: ${requestContentType}`, () => {
        const { headers } = compileResult.transactions[i].request;
        const contentType = headers
          .filter(header => header.name === 'Content-Type')
          .map(header => header.value)[0];
        assert.equal(contentType, requestContentType);
      });
      it(`has response with status code ${responseStatusCode}`, () => {
        assert.equal(
          compileResult.transactions[i].response.status,
          responseStatusCode
        );
      });
    }));
  });

  describe('without multiple transaction examples', () => {
    const detectTransactionExampleNumbersStub = sinon.spy(detectTransactionExampleNumbers);
    const stubbedCompile = proxyquire('../../lib/compile', {
      './detectTransactionExampleNumbers': detectTransactionExampleNumbersStub,
    });
    const { mediaType, apiElements } = fixtures('one-transaction-example').apib;
    const compileResult = stubbedCompile(mediaType, apiElements);

    it('calls the detection of transaction examples', () => {
      assert.isTrue(detectTransactionExampleNumbersStub.called);
    });
    it('produces one transaction', () => {
      assert.jsonSchema(compileResult, createCompileResultSchema({
        transactions: 1,
      }));
    });
    context('the transaction', () => {
      it('is identified as part of no example in \'origin\'', () => {
        assert.equal(compileResult.transactions[0].origin.exampleName, '');
      });
    });
  });

  describe('with arbitrary action', () => {
    const filename = 'apiDescription.apib';
    const { mediaType, apiElements } = fixtures('arbitrary-action').apib;
    const compileResult = compile(mediaType, apiElements, filename);

    it('produces two transactions', () => {
      assert.jsonSchema(compileResult, createCompileResultSchema({
        transactions: 2,
      }));
    });

    context('the action within a resource', () => {
      it('has URI inherited from the resource', () => {
        assert.equal(compileResult.transactions[0].request.uri, '/resource/1');
      });
      it('has its method', () => {
        assert.equal(compileResult.transactions[0].request.method, 'GET');
      });
    });

    context('the arbitrary action', () => {
      it('has its own URI', () => {
        assert.equal(compileResult.transactions[1].request.uri, '/arbitrary/sample');
      });
      it('has its method', () => {
        assert.equal(compileResult.transactions[1].request.method, 'POST');
      });
    });
  });

  describe('without sections', () => {
    const filename = 'apiDescription.apib';
    const { mediaType, apiElements } = fixtures('without-sections').apib;
    const compileResult = compile(mediaType, apiElements, filename);

    it('produces one transaction', () => {
      assert.jsonSchema(compileResult, createCompileResultSchema({
        transactions: 1,
      }));
    });

    context('\'origin\'', () => {
      it('uses filename as API name', () => {
        assert.equal(compileResult.transactions[0].origin.apiName, filename);
      });
      it('uses empty string as resource group name', () => {
        assert.equal(compileResult.transactions[0].origin.resourceGroupName, '');
      });
      it('uses URI as resource name', () => {
        assert.equal(compileResult.transactions[0].origin.resourceName, '/message');
      });
      it('uses method as action name', () => {
        assert.equal(compileResult.transactions[0].origin.actionName, 'GET');
      });
    });
  });

  describe('with different sample and default value of URI parameter', () => {
    const { mediaType, apiElements } = fixtures('prefer-sample').apib;
    const compileResult = compile(mediaType, apiElements);

    it('produces one transaction', () => {
      assert.jsonSchema(compileResult, createCompileResultSchema({
        transactions: 1,
      }));
    });
    it('expands the request URI using the sample value', () => {
      assert.equal(compileResult.transactions[0].request.uri, '/honey?beekeeper=Pavan');
    });
  });

  describe('with response without explicit status code', () => {
    const { mediaType, apiElements } = fixtures('no-status').apib;
    const compileResult = compile(mediaType, apiElements);

    it('produces 1 annotation and 1 transaction', () => {
      assert.jsonSchema(compileResult, createCompileResultSchema({
        annotations: 1,
        transactions: 1,
      }));
    });
    it('produces warning about the response status code being assumed', () => {
      assert.jsonSchema(compileResult.annotations[0], createAnnotationSchema({
        type: 'warning',
        component: 'apiDescriptionParser',
        message: 'missing response HTTP status code, assuming',
      }));
    });
    it('assumes HTTP 200', () => {
      assert.equal(compileResult.transactions[0].response.status, '200');
    });
  });

  describe('with multiple HTTP headers of the same name', () => {
    const { mediaType, apiElements } = fixtures('http-headers-multiple').apib;
    const compileResult = compile(mediaType, apiElements);

    it('produces 1 annotation and 1 transaction', () => {
      assert.jsonSchema(compileResult, createCompileResultSchema({
        annotations: 1,
        transactions: 1,
      }));
    });
    it('produces warning about duplicate header names', () => {
      assert.jsonSchema(compileResult.annotations[0], createAnnotationSchema({
        type: 'warning',
        component: 'apiDescriptionParser',
        message: /duplicate definition.+header/,
      }));
    });

    context('the transaction', () => {
      it('has the expected request headers', () => {
        assert.deepEqual(compileResult.transactions[0].request.headers, [
          { name: 'Content-Type', value: 'application/json' },
          { name: 'X-Multiple', value: 'foo' },
          { name: 'X-Multiple', value: 'bar' },
        ]);
      });
      it('has the expected response headers', () => {
        assert.deepEqual(compileResult.transactions[0].response.headers, [
          { name: 'Content-Type', value: 'application/json' },
          { name: 'Set-Cookie', value: 'session-id=123' },
          { name: 'Set-Cookie', value: 'likes-honey=true' },
        ]);
      });
    });
  });
});
