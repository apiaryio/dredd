const proxyquire = require('proxyquire').noPreserveCache();

const createAnnotationSchema = require('../schemas/createAnnotationSchema');
const createCompileResultSchema = require('../schemas/createCompileResultSchema');

const { assert, fixtures } = require('../support');
const compile = require('../../lib/compile');


describe('compile() · all API description formats', () => {
  describe('ordinary, valid API description', () => {
    fixtures('ordinary').forEachDescribe(({ mediaType, apiElements }) => {
      const filename = 'apiDescription.ext';
      const compileResult = compile(mediaType, apiElements, filename);

      it('is compiled into a compile result of expected structure', () => {
        assert.jsonSchema(compileResult, createCompileResultSchema({ filename }));
      });
    });
  });

  describe('causing an error in the parser', () => {
    fixtures('parser-error').forEachDescribe(({ mediaType, apiElements }) => {
      const compileResult = compile(mediaType, apiElements);

      it('produces one annotation and no transactions', () => {
        assert.jsonSchema(compileResult, createCompileResultSchema({
          annotations: 1,
          transactions: 0,
        }));
      });
      it('produces error from parser', () => {
        assert.jsonSchema(compileResult.annotations[0], createAnnotationSchema({
          type: 'error',
          component: 'apiDescriptionParser',
        }));
      });
    });
  });

  describe('causing an error in URI expansion', () => {
    // Parsers may provide warning in similar situations, however, we do not
    // want to rely on them (implementations differ). This error is returned
    // in case Dredd Transactions are not able to parse the URI template.
    // Mind that situations when parser gives the warning and when this error
    // is thrown can differ and also the severity is different.
    fixtures('uri-expansion-annotation').forEachDescribe(({ mediaType, apiElements }) => {
      const compileResult = compile(mediaType, apiElements);

      it('produces some annotations and no transactions', () => {
        assert.jsonSchema(compileResult, createCompileResultSchema({
          annotations: [1, 2],
          transactions: 0,
        }));
      });
      it('produces maximum one warning from parser and exactly one error from URI expansion', () => {
        const warning = createAnnotationSchema({
          type: 'warning',
          component: 'apiDescriptionParser',
        });
        const error = createAnnotationSchema({
          type: 'error',
          component: 'uriTemplateExpansion',
          message: /failed to parse uri template/i,
        });

        assert.jsonSchema(compileResult.annotations, {
          oneOf: [
            { type: 'array', items: [warning, error] },
            { type: 'array', items: [error] },
          ],
        });
      });
    });
  });

  describe('causing an error in URI parameters validation', () => {
    // Parsers may provide warning in similar situations, however, we do not
    // want to rely on them (implementations differ). This error is returned
    // in case Dredd Transactions are not satisfied with the input for
    // expanding the URI template. Mind that situations when parser gives
    // the warning and when this error is returned can differ and also
    // the severity is different.
    fixtures('uri-validation-annotation').forEachDescribe(({ mediaType, apiElements }) => {
      const compileResult = compile(mediaType, apiElements);

      it('produces some annotations and no transactions', () => {
        assert.jsonSchema(compileResult, createCompileResultSchema({
          annotations: [2, 3],
          transactions: 0,
        }));
      });
      it('produces maximum one warning from parser, exactly one warning from URI expansion, and exactly one error from URI parameters validation', () => {
        const parserWarning = createAnnotationSchema({
          type: 'warning',
          component: 'apiDescriptionParser',
        });
        const uriExpansionWarning = createAnnotationSchema({
          type: 'warning',
          component: 'uriTemplateExpansion',
        });
        const uriValidationError = createAnnotationSchema({
          type: 'error',
          component: 'parametersValidation',
          message: 'no example',
        });

        assert.jsonSchema(compileResult.annotations, {
          oneOf: [
            { type: 'array', items: [parserWarning, uriValidationError, uriExpansionWarning] },
            { type: 'array', items: [uriValidationError, uriExpansionWarning] },
          ],
        });
      });
    });
  });

  describe('causing a warning in the parser', () => {
    fixtures('parser-warning').forEachDescribe(({ mediaType, apiElements }) => {
      const compileResult = compile(mediaType, apiElements);

      it('produces some annotations and one transaction', () => {
        assert.jsonSchema(compileResult, createCompileResultSchema({
          annotations: [1],
          transactions: 1,
        }));
      });

      context('the annotations', () => {
        it('are warnings', () => {
          compileResult.annotations
            .map(ann => assert.equal(ann.type, 'warning'));
        });
        it('come from parser', () => {
          compileResult.annotations
            .map(ann => assert.equal(ann.component, 'apiDescriptionParser'));
        });
      });
    });
  });

  describe('causing a warning in URI expansion', () => {
    // This is a test for an arbitrary warning coming from URI expansion, which
    // doesn't have any other special side effect. Since there are no such
    // warnings as of now (but were in the past and could be in the future),
    // we need to pretend it's possible in this test.
    fixtures('ordinary').forEachDescribe(({ mediaType, apiElements }) => {
      const message = '... dummy warning message ...';
      const stubbedCompile = proxyquire('../../lib/compile', {
        './compileURI': proxyquire('../../lib/compileURI', {
          './expandURItemplate': () => ({ uri: '/honey?beekeeper=Honza', errors: [], warnings: [message] }),
        }),
      });
      const compileResult = stubbedCompile(mediaType, apiElements);

      it('produces some annotations', () => {
        assert.jsonSchema(compileResult, createCompileResultSchema({
          annotations: [1],
        }));
      });
      it('produces warnings from URI expansion', () => {
        assert.jsonSchema(compileResult.annotations, {
          type: 'array',
          items: createAnnotationSchema({
            type: 'warning',
            component: 'uriTemplateExpansion',
            message,
          }),
        });
      });
    });
  });

  describe('causing an \'ambiguous parameters\' warning in URI expansion', () => {
    // Parsers may provide error in similar situations, however, we do not
    // want to rely on them (implementations differ). This warning is returned
    // in case parameters do not have any kind of value Dredd could use. Mind
    // that situations when parser gives the error and when this warning is
    // returned can differ and also the severity is different.
    //
    // Special side effect of the warning is that affected transactions
    // should be skipped (shouldn't appear in output of the compilation).
    fixtures('ambiguous-parameters-annotation').forEachDescribe(({ mediaType, apiElements }) => {
      const compileResult = compile(mediaType, apiElements);

      it('produces two annotations and no transactions', () => {
        assert.jsonSchema(compileResult, createCompileResultSchema({
          annotations: 2,
          transactions: 0,
        }));
      });
      it('produces one warning from URI expansion and one error from URI parameters validation', () => {
        assert.jsonSchema(compileResult.annotations, {
          type: 'array',
          items: [
            createAnnotationSchema({ type: 'error', component: 'parametersValidation' }),
            createAnnotationSchema({ type: 'warning', component: 'uriTemplateExpansion' }),
          ],
        });
      });
    });
  });

  describe('causing a warning in URI parameters validation', () => {
    // Since 'validateParams' doesn't actually return any warnings
    // (but could in the future), we need to pretend it's possible for this
    // test.
    fixtures('ordinary').forEachDescribe(({ mediaType, apiElements }) => {
      const message = '... dummy warning message ...';
      const stubbedCompile = proxyquire('../../lib/compile', {
        './compileURI': proxyquire('../../lib/compileURI', {
          './validateParams': () => ({ errors: [], warnings: [message] }),
        }),
      });
      const compileResult = stubbedCompile(mediaType, apiElements);

      it('produces some annotations', () => {
        assert.jsonSchema(compileResult, createCompileResultSchema({
          annotations: [1],
        }));
      });
      it('produces warnings from URI parameters validation', () => {
        assert.jsonSchema(compileResult.annotations, {
          type: 'array',
          items: createAnnotationSchema({
            type: 'warning',
            component: 'parametersValidation',
            message,
          }),
        });
      });
    });
  });

  describe('with enum parameter', () => {
    fixtures('enum-parameter').forEachDescribe(({ mediaType, apiElements }) => {
      const compileResult = compile(mediaType, apiElements);

      it('produces one transaction', () => {
        assert.jsonSchema(compileResult, createCompileResultSchema({
          transactions: 1,
        }));
      });
      it('expands the request URI with the first enum value', () => {
        assert.equal(compileResult.transactions[0].request.uri, '/honey?beekeeper=Adam');
      });
    });
  });

  describe('with enum parameter having example value', () => {
    fixtures('enum-parameter-example').forEachDescribe(({ mediaType, apiElements }) => {
      const compileResult = compile(mediaType, apiElements);

      it('produces one transaction', () => {
        assert.jsonSchema(compileResult, createCompileResultSchema({
          transactions: 1,
        }));
      });
      it('expands the request URI with the example value', () => {
        assert.equal(compileResult.transactions[0].request.uri, '/honey?beekeeper=Honza');
      });
    });
  });

  describe('with enum parameter having unlisted example value', () => {
    // Parsers may provide warning in similar situations, however, we do not
    // want to rely on them (implementations differ). This error is returned
    // in case enum parameters have an example value, which is not allowed
    // by the enum. Mind that situations when parser gives the warning and
    // when this error is returned can differ and also the severity is different.
    fixtures('enum-parameter-unlisted-example').forEachDescribe(({ mediaType, apiElements }) => {
      const compileResult = compile(mediaType, apiElements);

      it('produces some annotations and one transaction', () => {
        assert.jsonSchema(compileResult, createCompileResultSchema({
          annotations: [1, 2],
          transactions: 1,
        }));
      });
      it('produces maximum one warning from parser, and exactly one error from URI parameters validation', () => {
        const warning = createAnnotationSchema({
          type: 'warning',
          component: 'apiDescriptionParser',
        });
        const error = createAnnotationSchema({
          type: 'error',
          component: 'parametersValidation',
          message: 'example value is not one of enum values',
        });

        assert.jsonSchema(compileResult.annotations, {
          oneOf: [
            { type: 'array', items: [warning, error] },
            { type: 'array', items: [error] },
          ],
        });
      });
      it('expands the request URI with the example value', () => {
        assert.equal(compileResult.transactions[0].request.uri, '/honey?beekeeper=Pavan');
      });
    });
  });

  describe('with parameters having example values', () => {
    fixtures('example-parameters').forEachDescribe(({ mediaType, apiElements }) => {
      const compileResult = compile(mediaType, apiElements);

      it('produces one transaction', () => {
        assert.jsonSchema(compileResult, createCompileResultSchema({
          transactions: 1,
        }));
      });
      it('expands the request URI with the example value', () => {
        assert.equal(compileResult.transactions[0].request.uri, '/honey?beekeeper=Honza&flavour=spicy');
      });
    });
  });

  describe('with response schema', () => {
    fixtures('response-schema').forEachDescribe(({ mediaType, apiElements }) => {
      const compileResult = compile(mediaType, apiElements);

      it('produces one transaction', () => {
        assert.jsonSchema(compileResult, createCompileResultSchema({
          transactions: 2,
        }));
      });

      context('the first transaction', () => {
        it('has the body in response data', () => {
          assert.ok(compileResult.transactions[0].response.body);
          assert.doesNotThrow(() => JSON.parse(compileResult.transactions[0].response.body));
        });
        it('has the schema in response data', () => {
          assert.ok(compileResult.transactions[0].response.schema);
          assert.doesNotThrow(() => JSON.parse(compileResult.transactions[0].response.schema));
        });
      });

      context('the second transaction', () => {
        it('has no body in response data', () => {
          assert.notOk(compileResult.transactions[1].response.body);
        });
        it('has the schema in response data', () => {
          assert.ok(compileResult.transactions[1].response.schema);
          assert.doesNotThrow(() => JSON.parse(compileResult.transactions[1].response.schema));
        });
      });
    });
  });

  describe('with inheritance of URI parameters', () => {
    fixtures('parameters-inheritance').forEachDescribe(({ mediaType, apiElements }) => {
      const compileResult = compile(mediaType, apiElements);

      it('produces one transaction', () => {
        assert.jsonSchema(compileResult, createCompileResultSchema({
          transactions: 1,
        }));
      });
      it('expands the request URI using correct inheritance cascade', () => {
        assert.equal(compileResult.transactions[0].request.uri, '/honey?beekeeper=Honza&amount=42');
      });
    });
  });

  describe('with different default value and first enum value of URI parameter', () => {
    fixtures('prefer-default').forEachDescribe(({ mediaType, apiElements }) => {
      const compileResult = compile(mediaType, apiElements);

      it('produces one transaction', () => {
        assert.jsonSchema(compileResult, createCompileResultSchema({
          transactions: 1,
        }));
      });
      it('expands the request URI using the default value', () => {
        assert.equal(compileResult.transactions[0].request.uri, '/honey?beekeeper=Adam');
      });
    });
  });

  describe('with default value for a required URI parameter', () => {
    fixtures('default-required').forEachDescribe(({ mediaType, apiElements }) => {
      const compileResult = compile(mediaType, apiElements);

      it('produces some annotations and one transaction', () => {
        assert.jsonSchema(compileResult, createCompileResultSchema({
          annotations: [1, 2],
          transactions: 1,
        }));
      });
      it('produces maximum one warning from parser, and exactly one warning from URI expansion', () => {
        const parserWarning = createAnnotationSchema({
          type: 'warning',
          component: 'apiDescriptionParser',
        });
        const uriExpansionWarning = createAnnotationSchema({
          type: 'warning',
          component: 'uriTemplateExpansion',
          message: /default value for a required parameter/i,
        });

        assert.jsonSchema(compileResult.annotations, {
          oneOf: [
            { type: 'array', items: [parserWarning, uriExpansionWarning] },
            { type: 'array', items: [uriExpansionWarning] },
          ],
        });
      });
      it('expands the request URI using the default value', () => {
        assert.equal(compileResult.transactions[0].request.uri, '/honey?beekeeper=Honza');
      });
    });
  });

  describe('with HTTP headers', () => {
    fixtures('http-headers').forEachDescribe(({ mediaType, apiElements }) => {
      const compileResult = compile(mediaType, apiElements);

      it('produces one transaction', () => {
        assert.jsonSchema(compileResult, createCompileResultSchema({
          transactions: 1,
        }));
      });
      it('produces expected request headers', () => {
        assert.deepEqual(compileResult.transactions[0].request.headers, [
          { name: 'Content-Type', value: 'application/json' },
          { name: 'Accept', value: 'application/json' },
        ]);
      });
      it('produces expected response headers', () => {
        assert.deepEqual(compileResult.transactions[0].response.headers, [
          { name: 'Content-Type', value: 'application/json' },
          { name: 'X-Test', value: 'Adam' },
        ]);
      });
    });
  });

  describe('without explicit body', () => {
    fixtures('no-body').forEachDescribe(({ mediaType, apiElements }) => {
      const compileResult = compile(mediaType, apiElements);

      it('produces 2 transactions', () => {
        assert.jsonSchema(compileResult, createCompileResultSchema({
          transactions: 2,
        }));
      });
      it('produces transaction #1 with no body', () => {
        assert.isUndefined(compileResult.transactions[0].response.body);
      });
      it('produces transaction #2 with no body', () => {
        assert.isUndefined(compileResult.transactions[0].response.body);
      });
    });
  });

  describe('without explicit schema', () => {
    fixtures('no-schema').forEachDescribe(({ mediaType, apiElements }) => {
      const expectedContentTypes = ['application/json', 'application/json', 'text/csv', 'text/yaml'];
      const compileResult = compile(mediaType, apiElements);

      it(`produces ${expectedContentTypes.length} transactions`, () => {
        assert.jsonSchema(compileResult, createCompileResultSchema({
          transactions: expectedContentTypes.length,
        }));
      });
      expectedContentTypes.forEach((contentType, i) => context(`transaction #${i + 1}`, () => {
        it(`has '${contentType}' response`, () => {
          assert.deepEqual(compileResult.transactions[i].response.headers, [
            { name: 'Content-Type', value: contentType },
          ]);
        });
        it('has no schema', () => {
          assert.isUndefined(compileResult.transactions[i].response.schema);
        });
      }));
    });
  });

  describe('with \'multipart/form-data\' message bodies', () => {
    fixtures('multipart-form-data').forEachDescribe(({ format, mediaType, apiElements }) => {
      const expectedBody = [
        '--CUSTOM-BOUNDARY',
        'Content-Disposition: form-data; name="text"',
        'Content-Type: text/plain',
        '',
        'test equals to 42',
        '--CUSTOM-BOUNDARY',
        'Content-Disposition: form-data; name="json"',
        'Content-Type: application/json',
        '',
        '{"test": 42}',
        '',
        '--CUSTOM-BOUNDARY--',
        '',
      ].join('\r\n');
      const compileResult = compile(mediaType, apiElements);

      it('produces no annotations and 1 transaction', () => {
        assert.jsonSchema(compileResult, createCompileResultSchema({
          annotations: 0,
          transactions: 1,
        }));
      });

      context('the transaction', () => {
        it('has the expected request body', () => {
          // Remove the lines with Content-Type headers as OpenAPI 2 doesn't
          // support generating them for 'multipart/form-data' request bodies
          const expectedRequestBody = format === 'openapi2'
            ? expectedBody.split('\r\n').filter(line => !line.match(/Content-Type/)).join('\r\n')
            : expectedBody;

          assert.deepEqual(
            compileResult.transactions[0].request.body,
            expectedRequestBody
          );
        });
        it('has the expected response body', () => {
          assert.deepEqual(
            compileResult.transactions[0].response.body,
            expectedBody
          );
        });
      });
    });
  });
});
