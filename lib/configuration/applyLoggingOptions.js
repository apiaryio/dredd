const logger = require('../logger');
const reporterOutputLogger = require('../reporters/reporterOutputLogger');

/**
 * Applies logging options from the given configuration.
 * Operates on the validated normalized config.
 */
function applyLoggingOptions(config) {
  if (config.color === false) {
    logger.transports.console.colorize = false;
    reporterOutputLogger.transports.console.colorize = false;
  }

  // Handling the 'loglevel' value
  // TODO Can use "applySpec" here to produce next options?
  if (config.loglevel) {
    const loglevel = config.loglevel.toLowerCase();
    if (loglevel === 'silent') {
      logger.transports.console.silent = true;
    } else if (loglevel === 'warning') {
      logger.transports.console.level = 'warn';
    } else if (loglevel === 'debug') {
      logger.transports.console.level = 'debug';
      logger.transports.console.timestamp = true;
    } else if (['warn', 'error'].includes(loglevel)) {
      logger.transports.console.level = loglevel;
    } else {
      logger.transports.console.level = 'warn';
      throw new Error(`The logging level '${loglevel}' is unsupported, `
        + 'supported are: silent, error, warning, debug');
    }
  } else {
    logger.transports.console.level = 'warn';
  }
}

module.exports = applyLoggingOptions;
