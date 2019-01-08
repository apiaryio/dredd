const fs = require('fs');
const path = require('path');

const zoo = require('swagger-zoo');

function fromSwaggerZoo(name) {
  return zoo.features().reduce((result, feature) => {
    if (feature.name === name) return Object.assign({}, { value: feature.swagger });
    return result;
  }, {}).value; // Actual result (feature.swagger)
}

const fromFile = filename => fs.readFileSync(path.join(__dirname, filename)).toString();

const FORMAT_NAMES = {
  apib: 'API Blueprint',
  openapi2: 'OpenAPI 2',
  openapi3: 'OpenAPI 3',
};

// Fixture factory. Makes sure the fixtures are available both as an iterable
// array as well as name/source mapping.
function fixture(apiDescriptions = {}) {
  // The fixture is an array
  const fix = Object.keys(apiDescriptions).map(apiDescription => ({
    format: FORMAT_NAMES[apiDescription],
    source: apiDescriptions[apiDescription],
  }));

  // At the same time, it is an object so we can access specific format as
  // an object property
  Object.keys(apiDescriptions).forEach((apiDescription) => {
    fix[apiDescription] = apiDescriptions[apiDescription];
  });

  // And this is handy helper for tests
  fix.forEachDescribe = function forEachDescribe(fn) {
    return this.forEach(({ format, source }) => describe(format, () => fn({ format, source })));
  };

  return fix;
}

// Collection of API description fixtures. To iterate over all available formats
// of specific fixture (e.g. `parserError`), use:
//
//     fixtures.parserError.forEach(({format, source}) ->
//       ...
//     )
//
// To do the same in tests:
//
//     fixtures.parserError.forEachDescribe(({format, source}) ->
//       ...
//     )
//
// To get source of specific format of a specific fixture directly, use:
//
//     source = fixtures.parserError.apib
//
const fixtures = {
  // Supported by both API description formats
  empty: fixture({
    apib: '',
    openapi2: '',
    openapi3: '',
  }),
  ordinary: fixture({
    apib: fromFile('./apib/ordinary.apib'),
    openapi2: fromSwaggerZoo('action'),
  }),
  parserError: fixture({
    apib: fromFile('./apib/parser-error.apib'),
    openapi2: fromFile('./openapi2/parser-error.yml'),
  }),
  parserWarning: fixture({
    apib: fromFile('./apib/parser-warning.apib'),
    openapi2: fromSwaggerZoo('warnings'),
  }),
  uriExpansionAnnotation: fixture({
    apib: fromFile('./apib/uri-expansion-annotation.apib'),
    openapi2: fromFile('./openapi2/uri-expansion-annotation.yml'),
  }),
  uriValidationAnnotation: fixture({
    apib: fromFile('./apib/uri-validation-annotation.apib'),
    openapi2: fromFile('./openapi2/uri-validation-annotation.yml'),
  }),
  ambiguousParametersAnnotation: fixture({
    apib: fromFile('./apib/ambiguous-parameters-annotation.apib'),
    openapi2: fromFile('./openapi2/ambiguous-parameters-annotation.yml'),
  }),
  notSpecifiedInUriTemplateAnnotation: fixture({
    apib: fromFile('./apib/not-specified-in-uri-template-annotation.apib'),
    openapi2: fromFile('./openapi2/not-specified-in-uri-template-annotation.yml'),
  }),
  enumParameter: fixture({
    apib: fromFile('./apib/enum-parameter.apib'),
    openapi2: fromFile('./openapi2/enum-parameter.yml'),
  }),
  enumParameterExample: fixture({
    apib: fromFile('./apib/enum-parameter-example.apib'),
    openapi2: fromFile('./openapi2/enum-parameter-example.yml'),
  }),
  enumParameterUnlistedExample: fixture({
    apib: fromFile('./apib/enum-parameter-unlisted-example.apib'),
    openapi2: fromFile('./openapi2/enum-parameter-unlisted-example.yml'),
  }),
  responseSchema: fixture({
    apib: fromFile('./apib/response-schema.apib'),
    openapi2: fromSwaggerZoo('schema-reference'),
  }),
  parametersInheritance: fixture({
    apib: fromFile('./apib/parameters-inheritance.apib'),
    openapi2: fromFile('./openapi2/parameters-inheritance.yml'),
  }),
  preferDefault: fixture({
    apib: fromFile('./apib/prefer-default.apib'),
    openapi2: fromFile('./openapi2/prefer-default.yml'),
  }),
  httpHeaders: fixture({
    apib: fromFile('./apib/http-headers.apib'),
    openapi2: fromFile('./openapi2/http-headers.yml'),
  }),
  defaultRequired: fixture({
    apib: fromFile('./apib/default-required.apib'),
    openapi2: fromFile('./openapi2/default-required.yml'),
  }),
  exampleParameters: fixture({
    apib: fromFile('./apib/example-parameters.apib'),
    openapi2: fromFile('./openapi2/example-parameters.yml'),
  }),
  noBody: fixture({
    apib: fromFile('./apib/no-body.apib'),
    openapi2: fromFile('./openapi2/no-body.yml'),
  }),
  noSchema: fixture({
    apib: fromFile('./apib/no-schema.apib'),
    openapi2: fromFile('./openapi2/no-schema.yml'),
  }),
  multipartFormData: fixture({
    apib: fromFile('./apib/multipart-form-data.apib'),
    openapi2: fromFile('./openapi2/multipart-form-data.yml'),
  }),

  // Specific to API Blueprint
  unrecognizable: fixture({
    apib: fromFile('./apib/unrecognizable.apib'),
  }),
  missingTitleAnnotation: fixture({
    apib: fromFile('./apib/missing-title-annotation.apib'),
  }),
  multipleTransactionExamples: fixture({
    apib: fromFile('./apib/multiple-transaction-examples.apib'),
  }),
  oneTransactionExample: fixture({
    apib: fromFile('./apib/one-transaction-example.apib'),
  }),
  arbitraryAction: fixture({
    apib: fromFile('./apib/arbitrary-action.apib'),
  }),
  withoutSections: fixture({
    apib: fromFile('./apib/without-sections.apib'),
  }),
  preferSample: fixture({
    apib: fromFile('./apib/prefer-sample.apib'),
  }),
  noStatus: fixture({
    apib: fromFile('./apib/no-status.apib'),
  }),
  httpHeadersMultiple: fixture({
    apib: fromFile('./apib/http-headers-multiple.apib'),
  }),

  // Specific to OpenAPI 2
  produces: fixture({
    openapi2: fromSwaggerZoo('produces-header'),
  }),
  producesCharset: fixture({
    openapi2: fromFile('./openapi2/produces-charset.yml'),
  }),
  producesNonJSONExample: fixture({
    openapi2: fromFile('./openapi2/produces-non-json-example.yml'),
  }),
  consumes: fixture({
    openapi2: fromFile('./openapi2/consumes.yml'),
  }),
  multipleResponses: fixture({
    openapi2: fromFile('./openapi2/multiple-responses.yml'),
  }),
  securityDefinitionsMultipleResponses: fixture({
    openapi2: fromFile('./openapi2/security-definitions-multiple-responses.yml'),
  }),
  securityDefinitionsTransitions: fixture({
    openapi2: fromSwaggerZoo('auth-oauth2-implicit'),
  }),
  defaultResponse: fixture({
    openapi2: fromFile('./openapi2/default-response.yml'),
  }),

  // Specific to OpenAPI 3
  proofOfConcept: fixture({
    openapi3: fromFile('./openapi3/proof-of-concept.yml'),
  }),
};

module.exports = fixtures;
