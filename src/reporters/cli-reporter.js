const log = require('../logger');
const prettifyResponse = require('./../prettify-response');

let loggerStdout;
let loggerStderr;

function CliReporter(emitter, stats, tests, inlineErrors, details, options = {}) {
  this.type = 'cli';
  this.stats = stats;
  this.tests = tests;
  this.inlineErrors = inlineErrors;
  this.details = details;
  this.errors = [];

  this.configureEmitter(emitter);

  loggerStdout = options.loggerStdout || new log.Logger({ level: log.level, output: 'stdout' });
  loggerStderr = options.loggerStderr || new log.Logger({ level: log.level });

  loggerStderr.debug(`Using '${this.type}' reporter.`);
}

CliReporter.prototype.configureEmitter = function (emitter) {
  emitter.on('start', (rawBlueprint, callback) => {
    loggerStderr.info('Beginning Dredd testing...');
    callback();
  });

  emitter.on('end', (callback) => {
    if (!this.inlineErrors) {
      if (this.errors.length !== 0) { loggerStderr.info('Displaying failed tests...'); }
      for (const test of this.errors) {
        loggerStdout.fail(`${test.title} duration: ${test.duration}ms`);
        loggerStdout.fail(test.message);
        if (test.request) { loggerStderr.request(`\n${prettifyResponse(test.request)}\n`); }
        if (test.expected) { loggerStderr.expected(`\n${prettifyResponse(test.expected)}\n`); }
        if (test.actual) { loggerStderr.actual(`\n${prettifyResponse(test.actual)}\n\n`); }
      }
    }

    if (this.stats.tests > 0) {
      loggerStdout.complete(`${this.stats.passes} passing, ` +
        `${this.stats.failures} failing, ` +
        `${this.stats.errors} errors, ` +
        `${this.stats.skipped} skipped, ` +
        `${this.stats.tests} total`
      );
    }

    loggerStdout.complete(`Tests took ${this.stats.duration}ms`);
    callback();
  });

  emitter.on('test pass', (test) => {
    loggerStdout.pass(`${test.title} duration: ${test.duration}ms`);
    if (this.details) {
      loggerStderr.request(`\n${prettifyResponse(test.request)}\n`);
      loggerStderr.expected(`\n${prettifyResponse(test.expected)}\n`);
      loggerStderr.actual(`\n${prettifyResponse(test.actual)}\n\n`);
    }
  });

  emitter.on('test skip', test => loggerStdout.skip(test.title));

  emitter.on('test fail', (test) => {
    loggerStdout.fail(`${test.title} duration: ${test.duration}ms`);
    if (this.inlineErrors) {
      loggerStdout.fail(test.message);
      if (test.request) { loggerStderr.request(`\n${prettifyResponse(test.request)}\n`); }
      if (test.expected) { loggerStderr.expected(`\n${prettifyResponse(test.expected)}\n`); }
      if (test.actual) { loggerStderr.actual(`\n${prettifyResponse(test.actual)}\n\n`); }
    } else {
      this.errors.push(test);
    }
  });

  emitter.on('test error', (error, test) => {
    const connectionErrors = [
      'ECONNRESET',
      'ENOTFOUND',
      'ESOCKETTIMEDOUT',
      'ETIMEDOUT',
      'ECONNREFUSED',
      'EHOSTUNREACH',
      'EPIPE'
    ];

    if (connectionErrors.indexOf(error.code) > -1) {
      test.message = 'Error connecting to server under test!';
    }

    if (!this.inlineErrors) {
      this.errors.push(test);
    }

    loggerStderr.error(`${test.title} duration: ${test.duration}ms`);

    if (connectionErrors.indexOf(error.code) > -1) {
      loggerStderr.error(test.message);
    }
    loggerStderr.error(error.stack);
  });
};

module.exports = CliReporter;
