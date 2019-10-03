import ApiaryReporter from './reporters/ApiaryReporter';
import BaseReporter from './reporters/BaseReporter';
import CLIReporter from './reporters/CLIReporter';
import DotReporter from './reporters/DotReporter';
import HTMLReporter from './reporters/HTMLReporter';
import MarkdownReporter from './reporters/MarkdownReporter';
import NyanCatReporter from './reporters/NyanReporter';
import XUnitReporter from './reporters/XUnitReporter';

import logger from './logger';

const fileReporters = ['xunit', 'html', 'markdown', 'apiary'];

const cliReporters = ['dot', 'nyan'];

function intersection(a, b) {
  if (a.length > b.length) {
    [a, b] = Array.from([b, a]);
  }
  return Array.from(a).filter((value) => Array.from(b).includes(value));
}

function configureReporters(config, stats, runner) {
  addReporter('base', config.emitter, stats);

  const reporters = config.reporter;
  const outputs = config.output;

  logger.debug('Configuring reporters:', reporters, outputs);

  function addCli(reportersArr) {
    if (reportersArr.length > 0) {
      const usedCliReporters = intersection(reportersArr, cliReporters);
      if (usedCliReporters.length === 0) {
        return new CLIReporter(
          config.emitter,
          stats,
          config['inline-errors'],
          config.details,
        );
      }
      return addReporter(usedCliReporters[0], config.emitter, stats);
    }
    return new CLIReporter(
      config.emitter,
      stats,
      config['inline-errors'],
      config.details,
    );
  }

  function addReporter(reporter, emitter, statistics, path) {
    switch (reporter) {
      case 'xunit':
        return new XUnitReporter(emitter, statistics, path, config.details);
      case 'dot':
        return new DotReporter(emitter, statistics);
      case 'nyan':
        return new NyanCatReporter(emitter, statistics);
      case 'html':
        return new HTMLReporter(emitter, statistics, path, config.details);
      case 'markdown':
        return new MarkdownReporter(emitter, statistics, path, config.details);
      case 'apiary':
        return new ApiaryReporter(emitter, statistics, config, runner);
      default:
        // I don't even know where to begin...
        // TODO: DESIGN / REFACTOR WHOLE REPORTER(S) API FROM SCRATCH, THIS IS MADNESS!!1
        new BaseReporter(emitter, statistics);
    }
  }

  addCli(reporters);

  const usedFileReporters = intersection(reporters, fileReporters);

  stats.fileBasedReporters = usedFileReporters.length;

  if (usedFileReporters.length > 0) {
    let usedFileReportersLength = usedFileReporters.length;
    if (reporters.indexOf('apiary') > -1) {
      usedFileReportersLength -= 1;
    }

    if (usedFileReportersLength > outputs.length) {
      logger.warn(`
There are more reporters requiring output paths than there are output paths
provided. Using default paths for additional file-based reporters.
`);
    }

    return usedFileReporters.map((usedFileReporter, index) => {
      const path = outputs[index] ? outputs[index] : undefined;
      return addReporter(usedFileReporter, config.emitter, stats, path);
    });
  }
}

export default configureReporters;
