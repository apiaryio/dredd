const debug = require('debug')('*');

const levels = {
  debug: 3,
  error: 0,
  info: 2,
  warn: 1
};

class Logger {
  constructor(options = {}) {
    this.level = options.level || 'error';
    this.writer = options.writer || debug;
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

  warn(...args) {
    if (levels[this.level] >= 1) this.writer(...args);
  }
}

const defaultLogger = new Logger({ level: 'error' });
defaultLogger.Logger = Logger;

module.exports = defaultLogger;
