const fs = require('fs');
const path = require('path');

const Spec = require('mocha').reporters.Spec;
const LCov = require('mocha-lcov-reporter');

/**
 * Combined reporter
 *
 * Behaves the same way as Mocha's built-in 'Spec' reporter, but if
 * the environment variable 'COVERAGE_DIR' is set to a directory,
 * collects code coverage to './lcov/mocha.info' file.
 *
 * If you want to learn more about how coverage collecting works
 * in Dredd's test suite, see the 'npm run test:coverage' script.
 */
module.exports = function reporter(runner, options) {
  new Spec(runner, options);

  if (process.env.COVERAGE_DIR) {
    // Monkey-patching the 'LCov.prototype.write' so we could save
    // the LCov output to a file instead of a standard output
    LCov.prototype.write = function write(string) {
      const file = path.join(process.env.COVERAGE_DIR, 'mocha.info');
      fs.appendFileSync(file, string);
    };
    new LCov(runner, options);
  }
};
