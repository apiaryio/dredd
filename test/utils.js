const chai = require('chai');
const proxyquire = require('proxyquire').noPreserveCache();

const nativeCompile = require('../lib/compile');
const parse = require('../lib/parse');

chai.use(require('chai-json-schema'));

// Takes a fixture and parses it so we can test the compilation process.
function compileFixture(source, options, done) {
  let compile;

  if (typeof options === 'function') {
    [done, options] = Array.from([options, {}]); // eslint-disable-line no-param-reassign
  }

  if (options.stubs) {
    compile = proxyquire('../lib/compile', options.stubs);
  } else {
    compile = nativeCompile;
  }

  return parse(source, (err, parseResult) => {
    // Intentionally not passing any parse errors to `done()` here. They'll
    // appear in the `parseResult` too in form of annotations and we're testing
    // whether the compilation is able to deal with them.
    try {
      const { mediaType, apiElements } = parseResult;
      const result = compile(mediaType, apiElements, options.filename);
      done(null, result);
    } catch (error) {
      done(error);
    }
  });
}

module.exports = { assert: chai.assert, compileFixture };
