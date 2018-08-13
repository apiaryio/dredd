const debug = require('debug')('*');

const levels = {
  debug: 3,

  actual: 2,
  complete: 2,
  expected: 2,
  fail: 2,
  pass: 2,
  request: 2,
  skip: 2,

  info: 2,
  warning: 1,
  warn: 1,
  error: 0,
  log: 0
};

function composeArguments(type, ts, ...args) {
  return [ts, ts ? '-' : '', `${type}:`].filter(item => item !== '').concat(args);
}

function createTimestamp() {
  return `${(new Date(Date.now())).toISOString()}`;
}

function normalizeToLowerCase(input) {
  if (typeof input === 'string') return input.toLowerCase();
  return '';
}

function selectWriter(options) {
  if (typeof options.writer === 'function') return options.writer;
  if (options.output === 'stderr') return debug;
  return console.log.bind(console);
}

function write(type, ...args) {
  if (levels[this.level] >= levels[type] && !this.silent) {
    this.writer(...composeArguments(
      type,
      this.timestamp ? createTimestamp() : '',
      ...args
    ));
  }
}

/** Class representing application level logger. */
class Logger {
  /**
   * Create new logger instance.
   * @param {Object} [options]
   * @param {Object} [options.level] Custom log level - error|warn[ing]|info|debug|log
   * @param {Object} [options.output] Output stream - stderr|stdout
   * @param {Object} [options.writer] Custom stdout|stderr|whatever writer, overrides options.output
   * @param {Object} [options.silent] Disables output to stderr|stdout
   * @param {Object} [options.timestamp] Prefixes log with timestamp in ISO format
   */
  constructor(options = {}) {
    this.level = normalizeToLowerCase(options.level) || 'error';
    this.output = normalizeToLowerCase(options.output) || 'stderr';
    this.writer = selectWriter({ output: this.output, writer: options.writer });
    this.silent = options.silent || false;
    this.timestamp = options.timestamp || false;
  }

  debug(...args) { write.bind(this)('debug', ...args); }
  error(...args) { write.bind(this)('error', ...args); }
  info(...args) { write.bind(this)('info', ...args); }
  log(...args) { write.bind(this)('log', ...args); }
  warn(...args) { write.bind(this)('warn', ...args); }

  // CLI reporter logging API
  actual(...args) { write.bind(this)('actual', ...args); }
  complete(...args) { write.bind(this)('complete', ...args); }
  expected(...args) { write.bind(this)('expected', ...args); }
  fail(...args) { write.bind(this)('fail', ...args); }
  pass(...args) { write.bind(this)('pass', ...args); }
  skip(...args) { write.bind(this)('skip', ...args); }
  request(...args) { write.bind(this)('request', ...args); }

  set(options = {}) {
    Object.keys(options).forEach((key) => {
      this[key] = options[key];
    });
  }
}

const defaultLogger = new Logger({ level: 'error' });
defaultLogger.Logger = Logger;

module.exports = defaultLogger;
