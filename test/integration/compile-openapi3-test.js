const createCompilationResultSchema = require('../schemas/compilation-result');
const fixtures = require('../fixtures');

const { assert, compileFixture } = require('../utils');

describe('compile() · OpenAPI 3', () => {
  describe('ordinary, valid API description', () => {
    let compilationResult;

    before((done) => {
      compileFixture(fixtures.proofOfConcept.openapi3, (err, result) => {
        compilationResult = result;
        done(err);
      });
    });

    it('produces some annotation and some transactions', () => {
      assert.jsonSchema(compilationResult, createCompilationResultSchema({
        annotations: [1],
        transactions: [1],
      }));
    });
  });
});
