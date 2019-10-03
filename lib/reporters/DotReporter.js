import logger from '../logger';
import reporterOutputLogger from './reporterOutputLogger';
import prettifyResponse from '../prettifyResponse';

function DotReporter(emitter, stats) {
  this.type = 'dot';
  this.stats = stats;
  this.errors = [];

  this.configureEmitter(emitter);

  logger.debug(`Using '${this.type}' reporter.`);
}

DotReporter.prototype.configureEmitter = function configureEmitter(emitter) {
  emitter.on('start', (apiDescriptions, callback) => {
    logger.debug('Beginning Dredd testing...');
    callback();
  });

  emitter.on('end', (callback) => {
    if (this.stats.tests > 0) {
      if (this.errors.length > 0) {
        this.write('\n');
        reporterOutputLogger.info('Displaying failed tests...');
        for (const test of this.errors) {
          reporterOutputLogger.fail(
            `${test.title} duration: ${test.duration}ms`,
          );
          reporterOutputLogger.fail(test.message);
          reporterOutputLogger.request(`\n${prettifyResponse(test.request)}\n`);
          reporterOutputLogger.expected(
            `\n${prettifyResponse(test.expected)}\n`,
          );
          reporterOutputLogger.actual(`\n${prettifyResponse(test.actual)}\n\n`);
        }
      }
      this.write('\n');

      reporterOutputLogger.complete(`\
${this.stats.passes} passing, ${this.stats.failures} failing, \
${this.stats.errors} errors, ${this.stats.skipped} skipped\
`);
      reporterOutputLogger.complete(`Tests took ${this.stats.duration}ms`);

      callback();
    }
  });

  emitter.on('test pass', () => {
    this.write('.');
  });

  emitter.on('test skip', () => {
    this.write('-');
  });

  emitter.on('test fail', (test) => {
    this.write('F');
    this.errors.push(test);
  });

  emitter.on('test error', (error, test) => {
    this.write('E');
    test.message = `\nError: \n${error}\nStacktrace: \n${error.stack}\n`;
    this.errors.push(test);
  });
};

DotReporter.prototype.write = function write(str) {
  process.stdout.write(str);
};

export default DotReporter;
