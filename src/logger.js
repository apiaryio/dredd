const debug = require('debug')('*');

const levels = {
  debug: 3,
  error: 0,
  log: 0,
  info: 2,
  warning: 1,
  warn: 1
};

function normalizeToLowerCase(input) {
  if (typeof input === 'string') return input.toLowerCase();
  return '';
}

function selectWriter(options) {
  if (typeof options.writer === 'function') return options.writer;
  if (options.output === 'stderr') return debug;
  return console.log.bind(console);
}

/** Class representing application level logger. */
class Logger {
  /**
   * Create new logger instance.
   * @param {Object} [options]
   * @param {Object} [options.level] Custom log level - error|warn[ing]|info|debug|log
   * @param {Object} [options.output] Output stream - stderr|stdout
   * @param {Object} [options.writer] Custom stdout|stderr|whatever writer, overrides options.output
   */
  constructor(options = {}) {
    this.level = normalizeToLowerCase(options.level) || 'error';
    this.output = normalizeToLowerCase(options.output) || 'stderr';
    this.writer = selectWriter({ output: this.output, writer: options.writer });
  }

  debug(...args) {
    if (levels[this.level] >= 3) this.writer(...args);
  }

  error(...args) {
    if (levels[this.level] >= 0) this.writer(...args);
  }

  info(...args) {
    if (levels[this.level] >= 2) this.writer(...args);
  }

  log(...args) {
    if (levels[this.level] >= 0) this.writer(...args);
  }

  warn(...args) {
    if (levels[this.level] >= 1) this.writer(...args);
  }

  setLevel(level = 'error') {
    this.level = level;
  }
}

const defaultLogger = new Logger({ level: 'error' });
defaultLogger.Logger = Logger;

module.exports = defaultLogger;
