const clone = require('clone');
const { EventEmitter } = require('events');

const logger = require('./logger');

function coerceToArray(value) {
  if (Array.isArray(value)) {
    return value;
  } if (typeof value === 'string') {
    return [value];
  } if ((value == null)) {
    return [];
  }
  return value;
}

function applyLoggingOptions(options) {
  // Color can be either specified as "stringified bool" or bool (nothing else
  // is expected valid value). Here we're coercing the value to boolean.
  if (options.color === 'false') {
    options.color = false;
  } else if (options.color === 'true') {
    options.color = true;
  }

  logger.transports.console.colorize = options.color;
  logger.transports.console.silent = options.silent;
  logger.transports.console.timestamp = options.timestamp;
  logger.transports.console.level = options.level;

  return options;
}

function applyConfiguration(config) {
  const configuration = {
    server: null,
    emitter: new EventEmitter(),
    custom: { // Used for custom settings of various APIs or reporters
      // Keep commented-out, so these values are actually set by CLI
      // cwd: process.cwd()
    },
    options: {
      'dry-run': false,
      silent: false,
      reporter: null,
      output: null,
      debug: false,
      header: null,
      user: null,
      'inline-errors': false,
      details: false,
      method: [],
      only: [],
      color: true,
      level: 'info',
      timestamp: false,
      sorted: false,
      names: false,
      hookfiles: null,
      language: 'nodejs',
      'hooks-worker-timeout': 5000,
      'hooks-worker-connect-timeout': 1500,
      'hooks-worker-connect-retry': 500,
      'hooks-worker-after-connect-wait': 100,
      'hooks-worker-term-timeout': 5000,
      'hooks-worker-term-retry': 500,
      'hooks-worker-handler-host': '127.0.0.1',
      'hooks-worker-handler-port': 61321,
    },
  };

  // Normalize options and config
  for (const key of Object.keys(config || {})) {
    // Copy anything except "custom" hash
    const value = config[key];
    if (key !== 'custom') {
      configuration[key] = value;
    } else {
      if (!configuration.custom) { configuration.custom = {}; }
      const object = config.custom || {};
      for (const customKey of Object.keys(object || {})) {
        const customVal = object[customKey];
        configuration.custom[customKey] = clone(customVal, false);
      }
    }
  }

  // Coerce single/multiple options into an array
  configuration.options.reporter = coerceToArray(configuration.options.reporter);
  configuration.options.output = coerceToArray(configuration.options.output);
  configuration.options.header = coerceToArray(configuration.options.header);
  configuration.options.method = coerceToArray(configuration.options.method);
  configuration.options.only = coerceToArray(configuration.options.only);
  configuration.options.path = coerceToArray(configuration.options.path);

  configuration.options.method = configuration.options.method.map(method => method.toUpperCase());

  if (configuration.options.user) {
    const authHeader = `Authorization:Basic ${Buffer.from(configuration.options.user).toString('base64')}`;
    configuration.options.header.push(authHeader);
  }

  configuration.options = applyLoggingOptions(configuration.options);

  if (config) {
    if (config.hooksData
      || (config.options && (config.options.b || config.options.sandbox))) {
      throw new Error('DEPRECATED: Dredd does not support '
        + 'sandboxed JS hooks anymore. Use standard JS hooks instead.');
    }
    if (config.blueprintPath) {
      throw new Error('DEPRECATED: Dredd does not support '
        + "the 'blueprintPath' option anymore. Use 'path' instead.");
    }
  }

  return configuration;
}

module.exports = {
  applyConfiguration,
  applyLoggingOptions,
};
