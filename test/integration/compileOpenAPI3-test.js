const createCompileResultSchema = require('../schemas/createCompileResultSchema');

const { assert, fixtures } = require('../support');
const compile = require('../../lib/compile');


describe('compile() · OpenAPI 3', () => {
  describe('ordinary, valid API description', () => {
    const { mediaType, apiElements } = fixtures('proof-of-concept').openapi3;
    const compileResult = compile(mediaType, apiElements);

    it('produces some annotation and some transactions', () => {
      assert.jsonSchema(compileResult, createCompileResultSchema({
        annotations: [1],
        transactions: [1],
      }));
    });
  });
});
