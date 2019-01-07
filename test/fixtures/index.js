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
  apiBlueprint: 'API Blueprint',
  swagger: 'Swagger',
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
//     source = fixtures.parserError.apiBlueprint
//
const fixtures = {
  // Supported by both API description formats
  empty: fixture({
    apiBlueprint: '',
    swagger: '',
  }),
  ordinary: fixture({
    apiBlueprint: fromFile('./api-blueprint/ordinary.apib'),
    swagger: fromSwaggerZoo('action'),
  }),
  parserError: fixture({
    apiBlueprint: fromFile('./api-blueprint/parser-error.apib'),
    swagger: fromFile('./swagger/parser-error.yml'),
  }),
  parserWarning: fixture({
    apiBlueprint: fromFile('./api-blueprint/parser-warning.apib'),
    swagger: fromSwaggerZoo('warnings'),
  }),
  uriExpansionAnnotation: fixture({
    apiBlueprint: fromFile('./api-blueprint/uri-expansion-annotation.apib'),
    swagger: fromFile('./swagger/uri-expansion-annotation.yml'),
  }),
  uriValidationAnnotation: fixture({
    apiBlueprint: fromFile('./api-blueprint/uri-validation-annotation.apib'),
    swagger: fromFile('./swagger/uri-validation-annotation.yml'),
  }),
  ambiguousParametersAnnotation: fixture({
    apiBlueprint: fromFile('./api-blueprint/ambiguous-parameters-annotation.apib'),
    swagger: fromFile('./swagger/ambiguous-parameters-annotation.yml'),
  }),
  notSpecifiedInUriTemplateAnnotation: fixture({
    apiBlueprint: fromFile('./api-blueprint/not-specified-in-uri-template-annotation.apib'),
    swagger: fromFile('./swagger/not-specified-in-uri-template-annotation.yml'),
  }),
  enumParameter: fixture({
    apiBlueprint: fromFile('./api-blueprint/enum-parameter.apib'),
    swagger: fromFile('./swagger/enum-parameter.yml'),
  }),
  enumParameterExample: fixture({
    apiBlueprint: fromFile('./api-blueprint/enum-parameter-example.apib'),
    swagger: fromFile('./swagger/enum-parameter-example.yml'),
  }),
  enumParameterUnlistedExample: fixture({
    apiBlueprint: fromFile('./api-blueprint/enum-parameter-unlisted-example.apib'),
    swagger: fromFile('./swagger/enum-parameter-unlisted-example.yml'),
  }),
  responseSchema: fixture({
    apiBlueprint: fromFile('./api-blueprint/response-schema.apib'),
    swagger: fromSwaggerZoo('schema-reference'),
  }),
  parametersInheritance: fixture({
    apiBlueprint: fromFile('./api-blueprint/parameters-inheritance.apib'),
    swagger: fromFile('./swagger/parameters-inheritance.yml'),
  }),
  preferDefault: fixture({
    apiBlueprint: fromFile('./api-blueprint/prefer-default.apib'),
    swagger: fromFile('./swagger/prefer-default.yml'),
  }),
  httpHeaders: fixture({
    apiBlueprint: fromFile('./api-blueprint/http-headers.apib'),
    swagger: fromFile('./swagger/http-headers.yml'),
  }),
  defaultRequired: fixture({
    apiBlueprint: fromFile('./api-blueprint/default-required.apib'),
    swagger: fromFile('./swagger/default-required.yml'),
  }),
  exampleParameters: fixture({
    apiBlueprint: fromFile('./api-blueprint/example-parameters.apib'),
    swagger: fromFile('./swagger/example-parameters.yml'),
  }),
  noBody: fixture({
    apiBlueprint: fromFile('./api-blueprint/no-body.apib'),
    swagger: fromFile('./swagger/no-body.yml'),
  }),
  noSchema: fixture({
    apiBlueprint: fromFile('./api-blueprint/no-schema.apib'),
    swagger: fromFile('./swagger/no-schema.yml'),
  }),
  multipartFormData: fixture({
    apiBlueprint: fromFile('./api-blueprint/multipart-form-data.apib'),
    swagger: fromFile('./swagger/multipart-form-data.yml'),
  }),

  // Specific to API Blueprint
  unrecognizable: fixture({
    apiBlueprint: fromFile('./api-blueprint/unrecognizable.apib'),
  }),
  missingTitleAnnotation: fixture({
    apiBlueprint: fromFile('./api-blueprint/missing-title-annotation.apib'),
  }),
  multipleTransactionExamples: fixture({
    apiBlueprint: fromFile('./api-blueprint/multiple-transaction-examples.apib'),
  }),
  oneTransactionExample: fixture({
    apiBlueprint: fromFile('./api-blueprint/one-transaction-example.apib'),
  }),
  arbitraryAction: fixture({
    apiBlueprint: fromFile('./api-blueprint/arbitrary-action.apib'),
  }),
  withoutSections: fixture({
    apiBlueprint: fromFile('./api-blueprint/without-sections.apib'),
  }),
  preferSample: fixture({
    apiBlueprint: fromFile('./api-blueprint/prefer-sample.apib'),
  }),
  noStatus: fixture({
    apiBlueprint: fromFile('./api-blueprint/no-status.apib'),
  }),
  httpHeadersMultiple: fixture({
    apiBlueprint: fromFile('./api-blueprint/http-headers-multiple.apib'),
  }),

  // Specific to Swagger
  produces: fixture({
    swagger: fromSwaggerZoo('produces-header'),
  }),
  producesCharset: fixture({
    swagger: fromFile('./swagger/produces-charset.yml'),
  }),
  producesNonJSONExample: fixture({
    swagger: fromFile('./swagger/produces-non-json-example.yml'),
  }),
  consumes: fixture({
    swagger: fromFile('./swagger/consumes.yml'),
  }),
  multipleResponses: fixture({
    swagger: fromFile('./swagger/multiple-responses.yml'),
  }),
  securityDefinitionsMultipleResponses: fixture({
    swagger: fromFile('./swagger/security-definitions-multiple-responses.yml'),
  }),
  securityDefinitionsTransitions: fixture({
    swagger: fromSwaggerZoo('auth-oauth2-implicit'),
  }),
  defaultResponse: fixture({
    swagger: fromFile('./swagger/default-response.yml'),
  }),
};

module.exports = fixtures;
