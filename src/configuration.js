const clone = require('clone');
const { EventEmitter } = require('events');

const logger = require('./logger');

function coerceToArray(value) {
  if (Array.isArray(value)) {
    return value;
  } else if (typeof value === 'string') {
    return [value];
  } else if ((value == null)) {
    return [];
  } else {
    return value;
  }
};

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
};

function applyConfiguration(config) {
  let method;
  const configuration = {
    blueprintPath: null,
    server: null,
    emitter: new EventEmitter,
    hooksCode: null,
    custom: { // Used for custom settings of various APIs or reporters
      // Keep commented-out, so these values are actually set by DreddCommand
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
      'inline-errors':false,
      details: false,
      method: [],
      only: [],
      color: true,
      level: 'info',
      timestamp: false,
      sorted: false,
      names: false,
      hookfiles: null,
      sandbox: false,
      language: 'nodejs',
      'hooks-worker-timeout': 5000,
      'hooks-worker-connect-timeout': 1500,
      'hooks-worker-connect-retry': 500,
      'hooks-worker-after-connect-wait': 100,
      'hooks-worker-term-timeout': 5000,
      'hooks-worker-term-retry': 500,
      'hooks-worker-handler-host': '127.0.0.1',
      'hooks-worker-handler-port': 61321
    }
  };

  // Normalize options and config
  for (let key of Object.keys(config || {})) {
    // Copy anything except "custom" hash
    const value = config[key];
    if (key !== 'custom') {
      configuration[key] = value;
    } else {
      if (!configuration.custom) { configuration.custom = {}; }
      const object = config.custom || {};
      for (let customKey of Object.keys(object || {})) {
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

  // Support for legacy JS API options
  if (config.blueprintPath) {
    configuration.options.path.push(config.blueprintPath);
  }

  configuration.options.method = configuration.options.method.map(method => method.toUpperCase());

  if (configuration.options.user) {
    const authHeader = `Authorization:Basic ${new Buffer(configuration.options.user).toString('base64')}`;
    configuration.options.header.push(authHeader);
  }

  configuration.options = applyLoggingOptions(configuration.options);
  return configuration;
};

module.exports = {
  applyConfiguration,
  applyLoggingOptions
};
