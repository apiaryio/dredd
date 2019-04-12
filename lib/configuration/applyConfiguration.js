const R = require('ramda');
const { EventEmitter } = require('events');

const logger = require('../logger');
const getProxySettings = require('../getProxySettings');
const applyLoggingOptions = require('./applyLoggingOptions');
const validateConfig = require('./validateConfig');
const { normalizeConfig } = require('./normalizeConfig');

const DEFAULT_CONFIG = {
  http: {},
  endpoint: null,
  // TODO Find a way to deep merge default and custom configs
  // while presering prototypes.
  // When the next line is uncommented, "emitter" property will be processed
  // during "R.mergeDeepX" call, resulting into EventEmitter's instance prototype
  // not being copied. This breaks event emitter.
  // emitter: new EventEmitter(),
  custom: {
    cwd: process.cwd(),
  },
  path: [],
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
  loglevel: 'warn',
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

/**
 * Flattens given configuration Object, removing nested "options" key.
 * This makes it possible to use nested "options" key without introducing
 * a breaking change to the library's public API.
 * TODO Remove this method after "options" key is removed in the next
 * major version. Document the removal of "options" in the Dredd docs.
 */
function flattenConfig(config) {
  const proxiedConfig = R.compose(
    // Rename root "server" key to "endpoint".
    // Necessary to prevent options values collision, as:
    // - root.server - stands for server url.
    // - options.server - stands for a server command (i.e. "npm start").
    // - options.endpoint - semantically the same as "root.server"
    // When merged, these values must not be overriden.
    R.dissoc('server'),
    R.over(
      R.lens(R.prop('server'), R.assoc('endpoint')),
      R.identity
    )
  )(config);

  const nestedOptions = R.prop('options', proxiedConfig);
  const rootOptions = R.omit(['server', 'options'], proxiedConfig);

  if (nestedOptions) {
    logger.warn('Deprecated usage of `options` in Dredd configuration.');
  }

  return R.mergeDeepLeft(nestedOptions || {}, rootOptions);
}

function resolveConfig(config) {
  const inConfig = R.compose(
    // Set "emitter" property explicitly to preserve its prototype.
    // During deep merge Ramda omits prototypes, breaking emitter.
    R.assoc('emitter', R.propOr(new EventEmitter(), 'emitter', config)),
    R.mergeDeepRight(DEFAULT_CONFIG),
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

  return {
    config: normalizeConfig(inConfig),
    warnings,
    errors,
  };
}

function applyConfiguration(config) {
  const { config: resolvedConfig } = resolveConfig(config);

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
  resolveConfig,
  _utils: {
    DEFAULT_CONFIG,
  },
};
