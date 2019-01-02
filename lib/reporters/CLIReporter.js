const logger = require('../logger');
const prettifyResponse = require('../prettifyResponse');

function CLIReporter(emitter, stats, tests, inlineErrors, details) {
  this.type = 'cli';
  this.stats = stats;
  this.tests = tests;
  this.inlineErrors = inlineErrors;
  this.details = details;
  this.errors = [];

  this.configureEmitter(emitter);

  logger.verbose(`Using '${this.type}' reporter.`);
}

CLIReporter.prototype.configureEmitter = function configureEmitter(emitter) {
  emitter.on('start', (rawBlueprint, callback) => {
    logger.info('Beginning Dredd testing...');
    callback();
  });

  emitter.on('end', (callback) => {
    if (!this.inlineErrors) {
      if (this.errors.length !== 0) { logger.info('Displaying failed tests...'); }
      for (const test of this.errors) {
        logger.fail(`${test.title} duration: ${test.duration}ms`);
        logger.fail(test.message);
        if (test.request) { logger.request(`\n${prettifyResponse(test.request)}\n`); }
        if (test.expected) { logger.expected(`\n${prettifyResponse(test.expected)}\n`); }
        if (test.actual) { logger.actual(`\n${prettifyResponse(test.actual)}\n\n`); }
      }
    }

    if (this.stats.tests > 0) {
      logger.complete(`${this.stats.passes} passing, `
        + `${this.stats.failures} failing, `
        + `${this.stats.errors} errors, `
        + `${this.stats.skipped} skipped, `
        + `${this.stats.tests} total`);
    }

    logger.complete(`Tests took ${this.stats.duration}ms`);
    callback();
  });

  emitter.on('test pass', (test) => {
    logger.pass(`${test.title} duration: ${test.duration}ms`);
    if (this.details) {
      logger.request(`\n${prettifyResponse(test.request)}\n`);
      logger.expected(`\n${prettifyResponse(test.expected)}\n`);
      logger.actual(`\n${prettifyResponse(test.actual)}\n\n`);
    }
  });

  emitter.on('test skip', test => logger.skip(test.title));

  emitter.on('test fail', (test) => {
    logger.fail(`${test.title} duration: ${test.duration}ms`);
    if (this.inlineErrors) {
      logger.fail(test.message);
      if (test.request) { logger.request(`\n${prettifyResponse(test.request)}\n`); }
      if (test.expected) { logger.expected(`\n${prettifyResponse(test.expected)}\n`); }
      if (test.actual) { logger.actual(`\n${prettifyResponse(test.actual)}\n\n`); }
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
      'EPIPE',
    ];

    if (connectionErrors.indexOf(error.code) > -1) {
      test.message = 'Error connecting to server under test!';
    }

    if (!this.inlineErrors) {
      this.errors.push(test);
    }

    logger.error(`${test.title} duration: ${test.duration}ms`);

    if (connectionErrors.indexOf(error.code) > -1) {
      return logger.error(test.message);
    }
    logger.error(error.stack);
  });
};

module.exports = CLIReporter;
