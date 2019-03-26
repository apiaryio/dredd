const logger = require('../logger');

function BaseReporter(emitter, stats) {
  this.type = 'base';
  this.stats = stats;
  this.configureEmitter(emitter);
  logger.debug(`Using '${this.type}' reporter.`);
}

BaseReporter.prototype.configureEmitter = function configureEmitter(emitter) {
  emitter.on('start', (apiDescriptions, callback) => {
    this.stats.start = new Date();
    callback();
  });

  emitter.on('end', (callback) => {
    this.stats.end = new Date();
    this.stats.duration = this.stats.end - this.stats.start;

    // FIXME: It looks like 'configureReporters' sneaks in this property to let
    // the reporters know how many files they should expect. This obviously
    // isn't ideal interface and it pollutes the 'stats' object, which is
    // a part of Dredd's public interface. This line cleans it up for now, but
    // ideally reporters would learn about the number of files in a nicer way.
    delete this.stats.fileBasedReporters;

    callback();
  });

  emitter.on('test start', (test) => {
    this.stats.tests += 1;
    test.start = new Date();
  });

  emitter.on('test pass', (test) => {
    this.stats.passes += 1;
    test.end = new Date();
    if (typeof test.start === 'string') {
      test.start = new Date(test.start);
    }
    test.duration = test.end - test.start;
  });

  emitter.on('test skip', () => {
    this.stats.skipped += 1;
  });

  emitter.on('test fail', (test) => {
    this.stats.failures += 1;
    test.end = new Date();
    if (typeof test.start === 'string') {
      test.start = new Date(test.start);
    }
    test.duration = test.end - test.start;
  });

  emitter.on('test error', (error, test) => {
    this.stats.errors += 1;
    test.end = new Date();
    if (typeof test.start === 'string') {
      test.start = new Date(test.start);
    }
    test.duration = test.end - test.start;
  });
};

module.exports = BaseReporter;
