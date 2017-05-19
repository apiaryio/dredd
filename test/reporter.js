fs = require('fs');

Spec = require('mocha').reporters.Spec;
LCov = require('mocha-lcov-reporter');


/**
 * Combined reporter
 *
 * Behaves the same way as Mocha's built-in 'Spec' reporter, but if
 * the environment variable 'COVERAGE_FILE' is set to a path,
 * collects code coverage to file.
 *
 * If you want to learn more about how coverage collecting works
 * in Dredd Transactions' test suite, see the 'npm run test:coverage'
 * script.
 */
module.exports = function (runner, options) {
  new Spec(runner, options);

  if (process.env.COVERAGE_FILE) {
    // Monkey-patching the 'LCov.prototype.write' so we could save
    // the LCov output to a file instead of a standard output
    LCov.prototype.write = function (string) {
      fs.appendFileSync(process.env.COVERAGE_FILE, string);
    }
    new LCov(runner, options);
  }
};
