const fs = require('fs');
const path = require('path');

const fury = require('@apielements/core');


const FORMATS = {
  apib: { name: 'API Blueprint', ext: '.apib', mediaType: 'text/vnd.apiblueprint' },
  openapi2: { name: 'OpenAPI 2', ext: '.yml', mediaType: 'application/swagger+yaml' },
  openapi3: { name: 'OpenAPI 3', ext: '.yml', mediaType: 'application/vnd.oai.openapi' },
};


function readAPIelements(apiElementsPath) {
  const contents = fs.readFileSync(apiElementsPath, 'utf8');
  return fury.minim.fromRefract(JSON.parse(contents));
}

function forEachDescribe(fn) {
  return this.forEach((fixture) => {
    describe(fixture.formatName, () => fn(fixture));
  });
}

function fixtures(basename) {
  const array = Object.keys(FORMATS)
    .map(format => ({
      format,
      formatName: FORMATS[format].name,
      mediaType: FORMATS[format].mediaType,
      apiDescriptionPath: path.join(__dirname, format, `${basename}${FORMATS[format].ext}`),
      apiElementsPath: path.join(__dirname, format, `${basename}.json`),
    }))
    // skip formats which do not have the requested fixture, but do not skip
    // fixtures with the API Elements JSON missing (should blow up and the
    // scripts/pretest.js should be ran to mitigate the issue)
    .filter(fixture => fs.existsSync(fixture.apiDescriptionPath))
    .map(fixture => Object.assign({
      apiDescription: fs.readFileSync(fixture.apiDescriptionPath, 'utf8'),
      apiElements: readAPIelements(fixture.apiElementsPath),
    }, fixture));

  // prevent invalid fixture names
  if (array.length < 1) {
    throw new Error(`The fixture '${basename}' doesn't exist for any API description format`);
  }

  // add convenience helper for Mocha tests
  array.forEachDescribe = forEachDescribe;

  // add convenience shortcuts to individual formats
  array.forEach((fixture) => {
    array[fixture.format] = fixture;
  });

  return array;
}


module.exports = fixtures;
