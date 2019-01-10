require('coffeescript/register');

const async = require('async');
const clone = require('clone');
const fs = require('fs');
const proxyquire = require('proxyquire').noCallThru();

const Hooks = require('./Hooks');
const HooksWorkerClient = require('./HooksWorkerClient');
const logger = require('./logger');
const mergeSandboxedHooks = require('./mergeSandboxedHooks');
const resolveHookfiles = require('./resolveHookfiles');
const sandboxHooksCode = require('./sandboxHooksCode');

// Note: runner.configuration.options must be defined
function addHooks(runner, transactions, callback) {
  function fixLegacyTransactionNames(hooks) {
    const pattern = /^\s>\s/g;
    ['beforeHooks', 'afterHooks'].forEach((hookType) => {
      Object.keys(hooks[hookType]).forEach((transactionName) => {
        const transactionHooks = hooks[hookType][transactionName];
        if (transactionName.match(pattern)) {
          const newTransactionName = transactionName.replace(pattern, '');
          if (hooks[hookType][newTransactionName]) {
            hooks[hookType][newTransactionName] = transactionHooks.concat(hooks[hookType][newTransactionName]);
          } else {
            hooks[hookType][newTransactionName] = transactionHooks;
          }
          delete hooks[hookType][transactionName];
        }
      });
    });
  }

  function loadHookFile(filePath) {
    try {
      proxyquire(filePath, {
        hooks: runner.hooks,
      });

      // Fixing #168 issue
      fixLegacyTransactionNames(runner.hooks);
    } catch (error) {
      logger.warn(`
Skipping hook loading. Error reading hook file '${filePath}'.
This probably means one or more of your hook files are invalid.
Message: ${error.message}
Stack: ${error.stack}
`);
    }
  }

  function loadSandboxHooksFromStrings(next) {
    const isHooksDataCorrect = (
      typeof runner.configuration.hooksData === 'object'
      || !Array.isArray(runner.configuration.hooksData)
    );

    if (!isHooksDataCorrect) {
      return next(
        new Error('hooksData option must be an object e.g. {"filename.js":"console.log("Hey!")"}')
      );
    }

    // Run code in sandbox
    async.eachSeries(Object.keys(runner.configuration.hooksData), (key, nextHook) => {
      const data = runner.configuration.hooksData[key];

      // Run code in sandbox
      sandboxHooksCode(data, (sandboxError, result) => {
        if (sandboxError) { return nextHook(sandboxError); }

        // Merge stringified hooks
        runner.hooks = mergeSandboxedHooks(runner.hooks, result);

        // Fixing #168 issue
        fixLegacyTransactionNames(runner.hooks);

        nextHook();
      });
    },
    next);
  }

  if (!runner.logs) { runner.logs = []; }
  runner.hooks = new Hooks({ logs: runner.logs, logger });

  if (!runner.hooks.transactions) { runner.hooks.transactions = {}; }

  Array.from(transactions).forEach((transaction) => {
    runner.hooks.transactions[transaction.name] = transaction;
  });

  // Loading hooks from string, sandbox mode must be enabled
  if (!(runner && runner.configuration && runner.configuration.options
        && runner.configuration.options.hookfiles)) {
    if (runner.configuration.hooksData) {
      if (runner.configuration.options.sandbox === true) {
        return loadSandboxHooksFromStrings(callback);
      }
      // Not sandboxed code can't be loaded from the string
      const msg = `
  Not sandboxed hooks loading from strings is not implemented,
  Sandbox mode must be enabled when loading hooks from strings.
`;
      return callback(new Error(msg));
    }
    // No data found, doing nothing
    return callback();
  }

  // Loading hookfiles from fs
  const hookfiles = [].concat(runner.configuration.options.hookfiles);
  const cwd = runner.configuration.custom ? runner.configuration.custom.cwd : null;
  let files;
  try {
    files = resolveHookfiles(hookfiles, cwd);
  } catch (err) {
    return callback(err);
  }
  logger.info('Found Hookfiles:', files);

  // Clone the configuration object to hooks.configuration to make it
  // accessible in the node.js hooks API
  runner.hooks.configuration = clone(runner.configuration);

  // Override hookfiles option in configuration object with
  // sorted and resolved files
  runner.hooks.configuration.options.hookfiles = files;

  // Loading files in non sandboxed nodejs
  if (!runner.configuration.options.sandbox === true) {
    // If the language is empty or it is nodejs
    if (!runner.configuration.options.language
           || runner.configuration.options.language === 'nodejs') {
      // Load regular files from fs
      for (const file of files) {
        loadHookFile(file);
      }

      return callback();

      // If other language than nodejs, run hooks worker client
      // Worker client will start the worker server and pass the "hookfiles" options as CLI arguments to it
    }
    // Start hooks worker
    return (new HooksWorkerClient(runner)).start(callback);


    // Loading files in sandboxed mode
  }
  // Load sandbox files from fs
  logger.warn('DEPRECATION WARNING: The sandboxed JavaScript hooks are deprecated. Use JavaScript hooks instead. See https://github.com/apiaryio/dredd/issues/1178');
  logger.info('Loading hook files in sandboxed context:', files);

  async.eachSeries(files, (resolvedPath, nextFile) => {
    // Load hook file content
    fs.readFile(resolvedPath, 'utf8', (readingError, data) => {
      if (readingError) { return nextFile(readingError); }
      // Run code in sandbox
      sandboxHooksCode(data, (sandboxError, result) => {
        if (sandboxError) { return nextFile(sandboxError); }
        runner.hooks = mergeSandboxedHooks(runner.hooks, result);

        // Fixing #168 issue
        fixLegacyTransactionNames(runner.hooks);

        nextFile();
      });
    });
  }, callback);
}

module.exports = addHooks;
