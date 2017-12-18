
const logger = require('../logger');
const prettifyResponse = require('../prettify-response');


class DotReporter {
  constructor(emitter, stats, tests) {
    this.type = 'dot';
    this.stats = stats;
    this.tests = tests;
    this.configureEmitter(emitter);
    this.errors = [];
    logger.verbose(`Using '${this.type}' reporter.`);
  }

  configureEmitter(emitter) {
    emitter.on('start', function(rawBlueprint, callback) {
      logger.info('Beginning Dredd testing...');
      return callback();
    });

    emitter.on('end', callback => {
      if (this.stats.tests > 0) {
        if (this.errors.length > 0) {
          this.write('\n');
          logger.info('Displaying failed tests...');
          for (let test of this.errors) {
            logger.fail(test.title + ` duration: ${test.duration}ms`);
            logger.fail(test.message);
            logger.request(`\n${prettifyResponse(test.request)}\n`);
            logger.expected(`\n${prettifyResponse(test.expected)}\n`);
            logger.actual(`\n${prettifyResponse(test.actual)}\n\n`);
          }
        }
        this.write('\n');

        logger.complete(`\
${this.stats.passes} passing, ${this.stats.failures} failing, \
${this.stats.errors} errors, ${this.stats.skipped} skipped\
`);
        logger.complete(`Tests took ${this.stats.duration}ms`);
        return callback();
      }
    });

    emitter.on('test pass', test => {
      return this.write('.');
    });

    emitter.on('test skip', test => {
      return this.write('-');
    });

    emitter.on('test fail', test => {
      this.write('F');
      return this.errors.push(test);
    });

    return emitter.on('test error', (error, test) => {
      this.write('E');
      test.message = `\nError: \n${error}\nStacktrace: \n${error.stack}\n`;
      return this.errors.push(test);
    });
  }

  write(str) {
    return process.stdout.write(str);
  }
}



module.exports = DotReporter;
