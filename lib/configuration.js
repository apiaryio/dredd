const R = require('ramda');
const clone = require('clone');
const { EventEmitter } = require('events');

const logger = require('./logger');
const getProxySettings = require('./getProxySettings');
const reporterOutputLogger = require('./reporters/reporterOutputLogger');

const coerceToArray = R.cond([
  [R.is(String), v => [v]],
  [R.isNil, R.always([])],
  [R.T, R.identity],
]);

// function coerceToArray(value) {
//   if (Array.isArray(value)) return value;
//   if (typeof value === 'string') return [value];
//   if (value == null) return [];
//   return value;
// }

function coerceToBoolean(value) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value) return true;
  return false;
}

function applyLoggingOptions(options) {
  if (options.color === false) {
    logger.transports.console.colorize = false;
    reporterOutputLogger.transports.console.colorize = false;
  }

  // Handling the 'loglevel' value
  if (options.loglevel) {
    const loglevel = options.loglevel.toLowerCase();
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

/**
 * Returns next config with deprecated options removed.
 */
const removeDeprecatedOptions = R.compose(
  // TODO Unnest "options" after flattening the config
  R.dissocPath(['options', 'c']),
  R.dissocPath(['options', 'l']),
  R.dissocPath(['options', 'level']),
  R.dissocPath(['options', 'q']),
  R.dissocPath(['options', 'silent']),
  R.dissocPath(['options', 't']),
  R.dissocPath(['options', 'timestamp']),
  R.dissocPath(['options', 'blueprintPath']),
  R.dissoc('data')
);

// TODO Finish and test keys
const coerceOptions = R.evolve({
  apiDescriptions: R.compose(
    R.map((content, index) => ({
      location: `configuration.apiDescriptions[${index}]`,
      content,
    })),
    coerceToArray
  ),
  reporter: coerceToArray,
  output: coerceToArray,
  header: coerceToArray,
  method: R.compose(R.map(R.toUpper), coerceToArray),
  only: coerceToArray,
  path: coerceToArray,
  hookfiles: coerceToArray,
});

// TODO Still confusing how to adequately compose { errors, warnings }
const deprecationWarnings = {
  level: 'Do not use `c`',
};

const deprecationErrors = {
  level: 'REMOVED level',
  timestamp: 'REMOVE timestamp',
};

function flushMessages(rules, config) {
  return Object.keys(rules).reduce((messages, optionName) => {
    return config[optionName]
      ? messages.concat(rules[optionName])
      : messages;
  }, []);
}

/**
 * Returns the errors and warnings relative to the given config.
 */
const validateConfig = config => ({
  errors: flushMessages(deprecationErrors, config),
  warnings: flushMessages(deprecationWarnings, config),
});

const sanitizeConfig = R.compose(
  coerceOptions,
  removeDeprecatedOptions
);

/**
 * Flattens giving configuration Object, removing nested "options" key.
 * TODO Remove this method after "options" key is deprecated in the next
 * major version.
 */
function flattenConfig(config) {
  const { options, ...restConfig } = config;

  if (options !== null) {
    logger.warn('Deprecated usage of `options` in Dredd configuration.');
  }

  return {
    ...restConfig,
    ...(options || {}),
  };
}


// function coerceRemovedOptions(config = {}) {
//   const errors = [];
//   const warnings = [];
//   const deprecatedLevel = config.l || config.level;

//   if (typeof config.color === 'string') {
//     config.color = coerceToBoolean(config.color);
//   }
//   if (deprecatedLevel) {
//     let loglevel;
//     if (['silly', 'debug', 'verbose'].includes(deprecatedLevel)) {
//       loglevel = 'debug';
//     } else if (deprecatedLevel === 'error') {
//       loglevel = 'error';
//     } else if (deprecatedLevel === 'silent') {
//       loglevel = 'silent';
//     } else {
//       loglevel = 'warn';
//     }
//     options.loglevel = loglevel;
//     options.l = loglevel;
//   }

//   if (config.data) {
//     warnings.push("DEPRECATED: The 'data' configuration property is deprecated "
//       + "in favor of 'apiDescriptions', please see https://dredd.org");

//     const apiDescriptions = Object.keys(config.data).map((location) => {
//       if (typeof config.data[location] === 'string') {
//         return {
//           location,
//           content: config.data[location],
//         };
//       }
//       return {
//         location: config.data[location].filename,
//         content: config.data[location].raw,
//       };
//     });
//     config.apiDescriptions = config.apiDescriptions
//       ? config.apiDescriptions.concat(apiDescriptions)
//       : apiDescriptions;
//     delete config.data;
//   }

//   return { errors, warnings };
// }

const defaultConfig = {
  http: {},
  server: null,
  emitter: new EventEmitter(),
  custom: {
    cwd: process.cwd(),
  },
  apiDescriptions: [],
  'dry-run': false,
  reporter: null,
  output: null,
  header: null,
  user: null,
  'inline-errors': false,
  details: false,
  method: [],
  only: [],
  color: true,
  loglevel: 'warning',
  sorted: false,
  names: false,
  hookfiles: [],
  language: 'nodejs',
  'hooks-worker-timeout': 5000,
  'hooks-worker-connect-timeout': 1500,
  'hooks-worker-connect-retry': 500,
  'hooks-worker-after-connect-wait': 100,
  'hooks-worker-term-timeout': 5000,
  'hooks-worker-term-retry': 500,
  'hooks-worker-handler-host': '127.0.0.1',
  'hooks-worker-handler-port': 61321,
};

function applyConfiguration(rawConfig) {
  const inConfig = flattenConfig(rawConfig);
  const outConfig = clone(defaultConfig); // TODO Don't clone, merge instead

  const { warnings, errors } = validateConfig(inConfig);
  warnings.forEach(message => logger.warn(message));
  errors.forEach(message => logger.error(message));

  const sanitizedConfig = sanitizeConfig(inConfig);
  console.log({ sanitizedConfig });

  // Transform apiDescriptions from strings to an array of objects
  // outConfig.apiDescriptions = coerceToArray(inConfig.apiDescriptions)
  //   .map((apiDescription, i) => ({
  //     location: `configuration.apiDescriptions[${i}]`,
  //     content: apiDescription,
  //   }));

  // Gracefully deal with the removed options
  // TODO Invoke this
  // const coerceResult = coerceRemovedOptions(inConfig);

  // Apply the values from the coerced config over the default ones
  const custom = inConfig.custom || {};
  Object.keys(custom)
    .forEach((key) => { outConfig.custom[key] = clone(custom[key], false); });

  // const options = inConfig.options || {};
  // Object.keys(options)
  //   .forEach((key) => { outConfig.options[key] = options[key]; });

  Object.keys(inConfig)
    .filter(key => !['custom', 'options'].includes(key))
    .forEach((key) => { outConfig[key] = inConfig[key]; });

  if (outConfig.user) {
    const token = Buffer.from(outConfig.user).toString('base64');
    outConfig.header.push(`Authorization: Basic ${token}`);
    delete outConfig.user;
  }

  applyLoggingOptions(outConfig);

  // Abort Dredd if there has been any errors
  // if (coerceResult.errors.length) {
  //   throw new Error('Could not configure Dredd');
  // }

  // HTTP settings for the 'request' library. Currently cannot be customized
  // by users, but in the future it should be. Leaking of 'request' library's
  // public interface must be prevented though - sensible user options should
  // be coerced to this object.
  // TODO Is setting "http" on the default config Object the same?
  // outConfig.http = {};

  // Log information about the HTTP proxy settings
  const proxySettings = getProxySettings(process.env);
  if (proxySettings.length) {
    logger.warn(
      `HTTP(S) proxy specified by environment variables: ${proxySettings.join(', ')}. `
      + 'Please read documentation on how Dredd works with proxies: '
      + 'https://dredd.org/en/latest/how-it-works/#using-https-proxy'
    );
  }

  return outConfig;
}


module.exports = {
  applyConfiguration,
  applyLoggingOptions,

  // only for the purpose of unit tests
  // _coerceRemovedOptions: coerceRemovedOptions,
};
