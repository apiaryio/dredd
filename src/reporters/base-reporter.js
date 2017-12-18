const logger = require('./../logger');


class BaseReporter {
  constructor(emitter, stats, tests) {
    this.configureEmitter = this.configureEmitter.bind(this);
    this.type = "base";
    this.stats = stats;
    this.tests = tests;
    this.configureEmitter(emitter);
    logger.verbose(`Using '${this.type}' reporter.`);
  }

  configureEmitter(emitter) {
    emitter.on('start', (rawBlueprint, callback) => {
      this.stats.start = new Date();
      return callback();
    });

    emitter.on('end', callback => {
      this.stats.end = new Date();
      this.stats.duration = this.stats.end - this.stats.start;
      return callback();
    });

    emitter.on('test start', test => {
      this.tests.push(test);
      this.stats.tests += 1;
      return test['start'] = new Date();
    });

    emitter.on('test pass', test => {
      this.stats.passes += 1;
      test['end'] = new Date();
      if (typeof test['start'] === 'string') {
        test['start'] = new Date(test['start']);
      }
      return test['duration'] = test.end - test.start;
    });

    emitter.on('test skip', test => {
      return this.stats.skipped += 1;
    });

    emitter.on('test fail', test => {
      this.stats.failures += 1;
      test['end'] = new Date();
      if (typeof test['start'] === 'string') {
        test['start'] = new Date(test['start']);
      }
      return test['duration'] = test.end - test.start;
    });

    return emitter.on('test error', (error, test) => {
      this.stats.errors += 1;
      test['end'] = new Date();
      if (typeof test['start'] === 'string') {
        test['start'] = new Date(test['start']);
      }
      return test['duration'] = test.end - test.start;
    });
  }
}



module.exports = BaseReporter;
