/**
 * TODO Account for option aliases (i.e. "l", "q").
 * Enforce strict rules not to be able to coerce removed options, only the deprecated ones.
 */
const deprecatedOptions = {
  c: 'DEPRECATED: The `c` configuration option is deprecated. Plese use `color` instead.',
  data: 'DEPRECATED: The `data` configuration option is deprecated '
    + 'in favor of `apiDescriptions`, please see https://dredd.org',
  blueprintPath: 'DEPRECATED: The `blueprintPath` configuration option is deprecated, '
    + 'please use `path` instead.',
  level: 'DEPRECATED: The `level` configuration option is deprecated. Please use `loglevel` instead.',
};

const unsupportedOptions = {
  timestamp: 'REMOVED: The `timestamp` configuration option is removed. Please use `--loglevel=debug` instead.',
  silent: 'REMOVED: The `silent` configuration option is removed. Please use `--loglevel=silent` instead.',
  sandbox: 'REMOVED: Dredd does not support sandboxed JS hooks anymore, use standard JS hooks instead.',
  hooksData: 'REMOVED: Dredd does not support sandboxed JS hooks anymore, use standard JS hooks instead.',
};

function flushMessages(options, config) {
  return Object.keys(options).reduce((messages, optionName) => (config[optionName]
    ? messages.concat(options[optionName])
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

module.exports = validateConfig;
