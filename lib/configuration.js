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

function coerceToBoolean(value) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value) return true;
  return false;
}

/**
 * Applies logging options from the given configuration.
 * Operates on the validated normalized config.
 */
function applyLoggingOptions(config) {
  if (!config.color) {
    logger.transports.console.colorize = false;
    reporterOutputLogger.transports.console.colorize = false;
  }

  // Handling the 'loglevel' value
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

/**
 * Removes deprecated options from the given config
 * and returns the next config.
 */
const removeDeprecatedOptions = R.compose(
  R.dissoc('c'),
  R.dissoc('l'),
  R.dissoc('level'),
  R.dissoc('q'),
  R.dissoc('silent'),
  R.dissoc('t'),
  R.dissoc('timestamp'),
  R.dissoc('blueprintPath'),
  R.dissoc('data')
);

const getUserHeader = R.compose(
  token => `Authorization: Basic ${token}`,
  user => Buffer.from(user).toString('base64')
);

const updateHeaderWithUser = R.compose(
  R.unnest,
  R.adjust(0, getUserHeader),
  R.values,
  R.pick(['user', 'header'])
);

/**
 * Appends authorization header when supplied with "user" option.
 */
const coerceUserOption = R.when(
  R.has('user'),
  R.compose(
    R.dissoc('user'),
    R.over(
      R.lens(updateHeaderWithUser, R.assoc('header')),
      R.identity
    )
  )
);

const coerceApiDescroptions = R.compose(
  R.map((content, index) => ({
    location: `configuration.apiDescriptions[${index}]`,
    content,
  })),
  coerceToArray
);

const coerceOptions = R.compose(
  coerceUserOption,
  R.evolve({
    apiDescriptions: coerceApiDescroptions,
    reporter: coerceToArray,
    output: coerceToArray,
    header: coerceToArray,
    method: R.compose(R.map(R.toUpper), coerceToArray),
    only: coerceToArray,
    path: coerceToArray,
    hookfiles: coerceToArray,
  })
);

/**
 * @todo Still confusing how to adequately compose { errors, warnings }
 */
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

const normalizeConfig = R.compose(
  coerceOptions,
  removeDeprecatedOptions
);

/**
 * Flattens giving configuration Object, removing nested "options" key.
 * @todo Remove this method after "options" key is deprecated in the next
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

  // Fail fast upon any Dredd configuration errors
  if (errors.length > 0) {
    throw new Error('Could not configure Dredd');
  }

  const normalizedConfig = normalizeConfig(inConfig);
  console.log({ normalizedConfig });

  /**
   * @todo Review if this is needed, and invoke if yes.
   */
  // Gracefully deal with the removed options
  // const coerceResult = coerceRemovedOptions(inConfig);

  // Apply the values from the coerced config over the default ones
  // const custom = inConfig.custom || {};
  // Object.keys(custom)
  //   .forEach((key) => { outConfig.custom[key] = clone(custom[key], false); });

  Object.keys(inConfig)
    .filter(key => !['custom', 'options'].includes(key))
    .forEach((key) => { outConfig[key] = inConfig[key]; });

  applyLoggingOptions(outConfig);

  // HTTP settings for the 'request' library. Currently cannot be customized
  // by users, but in the future it should be. Leaking of 'request' library's
  // public interface must be prevented though - sensible user options should
  // be coerced to this object.
  /**
   * @todo Is setting "http" on the default config Object the same?
   */
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
