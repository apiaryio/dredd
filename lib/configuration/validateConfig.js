const deprecatedOptions = [
  {
    options: ['c'],
    message: 'DEPRECATED: The -c configuration option is deprecated. Plese use --color instead.',
  },
  {
    options: ['data'],
    message: 'DEPRECATED: The --data configuration option is deprecated '
    + 'in favor of `apiDescriptions`, please see https://dredd.org',
  },
  {
    options: ['blueprintPath'],
    message: 'DEPRECATED: The --blueprintPath configuration option is deprecated, '
    + 'please use --path instead.',
  },
  {
    options: ['level'],
    message: 'DEPRECATED: The --level configuration option is deprecated. Please use --loglevel instead.',
  },
  {
    options: ['hooks-worker-timeout'],
    message: 'DEPRECATED: The --hooks-worker-timeout configuration option is deprecated. Please use --hooks-handler-timeout instead.',
  },
  {
    options: ['hooks-worker-connect-timeout'],
    message: 'DEPRECATED: The --hooks-worker-connect-timeout configuration option is deprecated. Please use --hooks-handler-connect-timeout instead.',
  },
  {
    options: ['hooks-worker-connect-retry'],
    message: 'DEPRECATED: The --hooks-worker-connect-retry configuration option is deprecated. Please use --hooks-handler-connect-retry instead.',
  },
  {
    options: ['hooks-worker-after-connect-wait'],
    message: 'DEPRECATED: The --hooks-worker-after-connect-wait configuration option is deprecated. Please use --hooks-handler-after-connect-wait instead.',
  },
  {
    options: ['hooks-worker-term-timeout'],
    message: 'DEPRECATED: The --hooks-worker-term-timeout configuration option is deprecated. Please use --hooks-handler-term-timeout instead.',
  },
  {
    options: ['hooks-worker-term-retry'],
    message: 'DEPRECATED: The --hooks-worker-term-retry configuration option is deprecated. Please use --hooks-handler-term-retry instead.',
  },
  {
    options: ['hooks-worker-handler-host'],
    message: 'DEPRECATED: The --hooks-worker-handler-host configuration option is deprecated. Please use --hooks-handler-host instead.',
  },
  {
    options: ['hooks-worker-handler-port'],
    message: 'DEPRECATED: The --hooks-worker-handler-port configuration option is deprecated. Please use --hooks-handler-port instead.',
  },
];

const unsupportedOptions = [
  {
    options: ['timestamp', 't'],
    message: 'REMOVED: The --timestamp/-t configuration option is no longer supported. Please use --loglevel=debug instead.',
  },
  {
    options: ['silent', 'q'],
    message: 'REMOVED: The --silent/-q configuration option is no longer supported. Please use --loglevel=silent instead.',
  },
  {
    options: ['sandbox', 'b'],
    message: 'REMOVED: Dredd does not support sandboxed JS hooks anymore, use standard JS hooks instead.',
  },
  {
    options: ['hooksData'],
    message: 'REMOVED: Dredd does not support sandboxed JS hooks anymore, use standard JS hooks instead.',
  },
];

function flushMessages(rules, config) {
  return Object.keys(config).reduce((messages, configKey) => {
    const warning = rules.find(rule => rule.options.includes(configKey));
    return warning ? messages.concat(warning.message) : messages;
  }, []);
}

/**
 * Returns the errors and warnings relative to the given config.
 */
const validateConfig = config => ({
  warnings: flushMessages(deprecatedOptions, config),
  errors: flushMessages(unsupportedOptions, config),
});

module.exports = validateConfig;
