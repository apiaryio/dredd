// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
const BaseReporter = require('./reporters/base-reporter');
const XUnitReporter = require('./reporters/x-unit-reporter');
const CliReporter = require('./reporters/cli-reporter');
const DotReporter = require('./reporters/dot-reporter');
const NyanCatReporter = require('./reporters/nyan-reporter');
const HtmlReporter = require('./reporters/html-reporter');
const MarkdownReporter = require('./reporters/markdown-reporter');
const ApiaryReporter = require('./reporters/apiary-reporter');

const logger = require('./logger');

const fileReporters = [
  'xunit',
  'html',
  'markdown',
  'apiary',
  'junit' // deprecated
];
const cliReporters = ['dot', 'nyan'];

const intersection = function(a, b) {
  if (a.length > b.length) { [a, b] = Array.from([b, a]); }
  return Array.from(a).filter((value) => Array.from(b).includes(value));
};

const configureReporters = function(config, stats, tests, runner) {
  const baseReporter = new BaseReporter(config.emitter, stats, tests);

  const reporters = config.options.reporter;
  const outputs = config.options.output;
  logger.verbose('Configuring reporters:', reporters, outputs);

  const addCli = function(reporters) {
    let cliReporter;
    if (reporters.length > 0) {
      const usedCliReporters = intersection(reporters, cliReporters);
      if (usedCliReporters.length === 0) {
        return cliReporter = new CliReporter(config.emitter, stats, tests, config.options['inline-errors'], config.options.details);
      } else {
        return addReporter(usedCliReporters[0], config.emitter, stats, tests);
      }
    } else {
      return cliReporter = new CliReporter(config.emitter, stats, tests, config.options['inline-errors'], config.options.details);
    }
  };

  var addReporter = function(reporter, emitter, stats, tests, path) {
    let apiaryReporter, dotReporter, htmlReporter, mdReporter, nyanCatReporter, xUnitReporter;
    switch (reporter) {
      case 'xunit':
        return xUnitReporter = new XUnitReporter(emitter, stats, tests, path, config.options.details);
      case 'junit': // deprecated
        logger.warn('junit will be deprecated in the future. Please use `xunit` instead.');
        return xUnitReporter = new XUnitReporter(emitter, stats, tests, path, config.options.details);
      case 'dot':
        return dotReporter = new DotReporter(emitter, stats, tests);
      case 'nyan':
        return nyanCatReporter = new NyanCatReporter(emitter, stats, tests);
      case 'html':
        return htmlReporter = new HtmlReporter(emitter, stats, tests, path, config.options.details);
      case 'markdown':
        return mdReporter = new MarkdownReporter(emitter, stats, tests, path, config.options.details);
      case 'apiary':
        return apiaryReporter = new ApiaryReporter(emitter, stats, tests, config, runner);
    }
  };
      // else
      //   Cannot happen, due to 'intersection' usage
      //   logger.warn "Invalid reporter #{reporter} selected, ignoring."


  if (!config.options.silent) { addCli(reporters); }

  const usedFileReporters = intersection(reporters, fileReporters);

  stats.fileBasedReporters = usedFileReporters.length;

  if (usedFileReporters.length > 0) {
    let usedFileReportersLength = usedFileReporters.length;
    if (reporters.indexOf('apiary') > -1) {
      usedFileReportersLength = usedFileReportersLength - 1;
    }

    if (usedFileReportersLength > outputs.length) {
      logger.warn(`\
There are more reporters requiring output paths than there are output paths \
provided. Using default paths for additional file-based reporters.\
`);
    }

    return (() => {
      const result = [];
      for (let i = 0; i < usedFileReporters.length; i++) {
        const reporter = usedFileReporters[i];
        const path = outputs[i] ? outputs[i] : null;
        result.push(addReporter(reporter, config.emitter, stats, tests, path));
      }
      return result;
    })();
  }
};



module.exports = configureReporters;
