const R = require('ramda');
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
  if (config.color === false) {
    logger.transports.console.colorize = false;
    reporterOutputLogger.transports.console.colorize = false;
  }

  // Handling the 'loglevel' value
  /**
   * @todo Can use "applySpec" here to produce next options?
   */
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
 * Removes options that are no longer supported by Dredd.
 * Any coercion will not be performed, as they are removed prior to coercion.
 */
const removeUnsupportedOptions = R.compose(
  R.dissoc('q'),
  R.dissoc('silent'),
  R.dissoc('t'),
  R.dissoc('timestamp'),
  R.dissoc('blueprintPath'),
  R.dissoc('b'),
  R.dissoc('sandbox')
);

const getUserHeader = R.compose(
  token => `Authorization: Basic ${token}`,
  user => Buffer.from(user).toString('base64'),
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
  R.propSatisfies(R.complement(R.isNil), 'user'),
  R.compose(
    R.dissoc('user'),
    R.over(
      R.lens(updateHeaderWithUser, R.assoc('header')),
      R.identity
    )
  )
);

const mapIndexed = R.addIndex(R.map);

const coerceApiDescriptions = R.compose(
  mapIndexed((content, index) => ({
    location: `configuration.apiDescriptions[${index}]`,
    content: R.when(R.has('content'), R.prop('content'), content),
  })),
  coerceToArray
);

/**
 * Coerces the given deprecated value of the "level" option
 * and returns the supported value for "loglevel" option.
 */
const coerceDeprecatedLevel = R.compose(
  R.dissoc('l'),
  R.dissoc('level'),
  R.over(
    R.lens(
      R.compose(
        R.cond([
          [
            R.includes(R.__, ['silly', 'debug', 'verbose']),
            R.always('debug'),
          ],
          [R.equals('error'), R.always('error')],
          [R.equals('silent'), R.always('silent')],
          [R.T, R.always('warn')],
        ]),
        R.either(R.prop('l'), R.prop('level'))
      ),
      R.assoc('loglevel')
    ),
    R.identity
  )
);

const coerceDeprecatedDataOption = R.when(
  R.propSatisfies(R.complement(R.isNil), 'data'),
  R.compose(
    R.dissoc('data'),
    R.over(
      R.lens(
        R.compose(
          R.unnest,
          R.values,
          R.evolve({
            data: R.compose(
              R.map(([location, content]) => {
                const nextDesdcription = (typeof content === 'string')
                  ? { location, content }
                  : {
                    location: content.filename,
                    content: content.raw,
                  };

                return nextDesdcription;
              }),
              R.toPairs
            ),
          }),
          R.pick(['apiDescriptions', 'data'])
        ),
        R.assoc('apiDescriptions')
      ),
      R.identity
    )
  )
);

const coerceColorOption = R.when(
  R.has('c'),
  R.compose(
    R.dissoc('c'),
    R.over(
      R.lens(R.prop('c'), R.assoc('color')),
      coerceToBoolean
    )
  )
);

const coerceDeprecatedOptions = R.compose(
  coerceColorOption,
  coerceDeprecatedDataOption,
  coerceDeprecatedLevel
);

const coerceOptions = R.compose(
  coerceDeprecatedOptions,
  coerceUserOption,
  R.evolve({
    color: coerceToBoolean,
    apiDescriptions: coerceApiDescriptions,
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
const deprecatedOptions = {
  c: 'DEPRECATED: The data `c` configuration option is deprecated. Plese use `color` instead.',
  data: 'DEPRECATED: The `data` configuration option is deprecated '
    + 'in favor of `apiDescriptions`, please see https://dredd.org',
  blueprintPath: 'DEPRECATED: The `blueprintPath` configuration option is deprecated, '
    + 'please use `path` instead.',
};

const unsupportedOptions = {
  level: 'REMOVED: The `level` configuration option is removed. Please use `--loglevel` instead.',
  timestamp: 'REMOVED: The `timestamp` configuration option is removed. Please use `--loglevel=debug` instead.',
  silent: 'REMOVED: The `silent` configuration option is removed. Please use `--loglevel=silent` instead.',
  sandbox: 'REMOVED: Dredd does not support sandboxed JS hooks anymore, use standard JS hooks instead.',
  hooksData: 'REMOVED: Dredd does not support sandboxed JS hooks anymore, use standard JS hooks instead.',
};

// TODO
function flushMessages(rules, config) {
  return Object.keys(rules).reduce((messages, optionName) => (config[optionName]
    ? messages.concat(rules[optionName])
    : messages
  ), []);
}

/**
 * Returns the errors and warnings relative to the given config.
 */
const validateConfig = config => ({
  warnings: flushMessages(deprecatedOptions, config),
  errors: flushMessages(unsupportedOptions, config),
});

const normalizeConfig = R.compose(
  coerceOptions,
  removeUnsupportedOptions
);

/**
 * Flattens giving configuration Object, removing nested "options" key.
 * This makes it possible to use nested "options" key without introducing
 * a breaking change to the library's API.
 * @todo Remove this method after "options" key is deprecated in the next
 * major version. Document the removal of "options" in the Dredd docs.
 */
function flattenConfig(config) {
  const options = R.propOr({}, 'options', config);
  const restConfig = R.omit('options', config);

  if (options !== null) {
    logger.warn('Deprecated usage of `options` in Dredd configuration.');
  }

  return R.mergeDeepLeft(options, restConfig);
}

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

function applyConfiguration(config) {
  const inConfig = R.compose(
    R.mergeDeepRight(defaultConfig),
    flattenConfig
  )(config);

  // Validate Dredd configuration
  const { warnings, errors } = validateConfig(inConfig);
  warnings.forEach(message => logger.warn(message));
  errors.forEach(message => logger.error(message));

  // Fail fast upon any Dredd configuration errors
  if (errors.length > 0) {
    throw new Error('Could not configure Dredd');
  }

  const resolvedConfig = normalizeConfig(inConfig);

  applyLoggingOptions(resolvedConfig);

  // Log information about the HTTP proxy settings
  const proxySettings = getProxySettings(process.env);
  if (proxySettings.length) {
    logger.warn(
      `HTTP(S) proxy specified by environment variables: ${proxySettings.join(', ')}. `
      + 'Please read documentation on how Dredd works with proxies: '
      + 'https://dredd.org/en/latest/how-it-works/#using-https-proxy'
    );
  }

  return resolvedConfig;
}

module.exports = {
  applyConfiguration,
  applyLoggingOptions,

  // only for the purpose of unit tests
  _normalizeConfig: normalizeConfig,
  _validateConfig: validateConfig,
  _coerceRemovedOptions: coerceDeprecatedOptions,
  _coerceDeprecatedLevel: coerceDeprecatedLevel,
};
