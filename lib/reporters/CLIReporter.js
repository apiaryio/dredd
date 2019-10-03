import logger from '../logger';
import reporterOutputLogger from './reporterOutputLogger';
import prettifyResponse from '../prettifyResponse';

const CONNECTION_ERRORS = [
  'ECONNRESET',
  'ENOTFOUND',
  'ESOCKETTIMEDOUT',
  'ETIMEDOUT',
  'ECONNREFUSED',
  'EHOSTUNREACH',
  'EPIPE',
];

function CLIReporter(emitter, stats, inlineErrors, details) {
  this.type = 'cli';
  this.stats = stats;
  this.inlineErrors = inlineErrors;
  this.details = details;
  this.errors = [];

  this.configureEmitter(emitter);

  logger.debug(`Using '${this.type}' reporter.`);
}

CLIReporter.prototype.configureEmitter = function configureEmitter(emitter) {
  emitter.on('start', (apiDescriptions, callback) => {
    logger.debug('Beginning Dredd testing...');
    callback();
  });

  emitter.on('end', (callback) => {
    if (!this.inlineErrors) {
      if (this.errors.length) {
        reporterOutputLogger.info('Displaying failed tests...');
      }
      this.errors.forEach((test) => {
        reporterOutputLogger.fail(`${test.title} duration: ${test.duration}ms`);
        reporterOutputLogger.fail(test.message);
        if (test.request)
          reporterOutputLogger.request(`\n${prettifyResponse(test.request)}\n`);
        if (test.expected)
          reporterOutputLogger.expected(
            `\n${prettifyResponse(test.expected)}\n`,
          );
        if (test.actual)
          reporterOutputLogger.actual(`\n${prettifyResponse(test.actual)}\n\n`);
      });
    }

    if (this.stats.tests > 0) {
      reporterOutputLogger.complete(
        `${this.stats.passes} passing, ` +
          `${this.stats.failures} failing, ` +
          `${this.stats.errors} errors, ` +
          `${this.stats.skipped} skipped, ` +
          `${this.stats.tests} total`,
      );
    }

    reporterOutputLogger.complete(`Tests took ${this.stats.duration}ms`);
    callback();
  });

  emitter.on('test pass', (test) => {
    reporterOutputLogger.pass(`${test.title} duration: ${test.duration}ms`);
    if (this.details) {
      reporterOutputLogger.request(`\n${prettifyResponse(test.request)}\n`);
      reporterOutputLogger.expected(`\n${prettifyResponse(test.expected)}\n`);
      reporterOutputLogger.actual(`\n${prettifyResponse(test.actual)}\n\n`);
    }
  });

  emitter.on('test skip', (test) => reporterOutputLogger.skip(test.title));

  emitter.on('test fail', (test) => {
    reporterOutputLogger.fail(`${test.title} duration: ${test.duration}ms`);
    if (this.inlineErrors) {
      reporterOutputLogger.fail(test.message);
      if (test.request) {
        reporterOutputLogger.request(`\n${prettifyResponse(test.request)}\n`);
      }
      if (test.expected) {
        reporterOutputLogger.expected(`\n${prettifyResponse(test.expected)}\n`);
      }
      if (test.actual) {
        reporterOutputLogger.actual(`\n${prettifyResponse(test.actual)}\n\n`);
      }
    } else {
      this.errors.push(test);
    }
  });

  emitter.on('test error', (error, test) => {
    if (CONNECTION_ERRORS.includes(error.code)) {
      test.message = 'Error connecting to server under test!';
      reporterOutputLogger.error(test.message);
    } else {
      reporterOutputLogger.error(error.stack);
    }

    reporterOutputLogger.error(`${test.title} duration: ${test.duration}ms`);
    if (!this.inlineErrors) {
      this.errors.push(test);
    }
  });
};

export default CLIReporter;
