/* eslint-disable
    func-names,
    global-require,
    no-param-reassign,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
const chai = require('chai');
chai.use(require('chai-json-schema'));
const proxyquire = require('proxyquire').noPreserveCache();

const parse = require('../src/parse');


// Takes a fixture and parses it so we can test the compilation process.
const compileFixture = function (source, options, done) {
  let compile;
  if (typeof options === 'function') { [done, options] = Array.from([options, {}]); }

  if (options.stubs) {
    compile = proxyquire('../src/compile', options.stubs);
  } else {
    compile = require('../src/compile');
  }

  return parse(source, (err, parseResult) => {
    // Intentionally not passing any parse errors to `done()` here. They'll
    // appear in the `parseResult` too in form of annotations and we're testing
    // whether the compilation is able to deal with them.
    try {
      const { mediaType, apiElements } = parseResult;
      const result = compile(mediaType, apiElements, options.filename);
      return done(null, result);
    } catch (error) {
      err = error;
      return done(err);
    }
  });
};


module.exports = { compileFixture, assert: chai.assert };
