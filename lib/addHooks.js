const clone = require('clone');
const proxyquire = require('proxyquire').noCallThru();

const Hooks = require('./Hooks');
const HooksWorkerClient = require('./HooksWorkerClient');
const logger = require('./logger');
const resolveHookfiles = require('./resolveHookfiles');

// Note: runner.configuration.options must be defined
function addHooks(runner, transactions, callback) {
  function loadHookFile(filePath) {
    try {
      proxyquire(filePath, {
        hooks: runner.hooks,
      });
    } catch (error) {
      logger.warn(`
Skipping hook loading. Error reading hook file '${filePath}'.
This probably means one or more of your hook files are invalid.
Message: ${error.message}
Stack: ${error.stack}
`);
    }
  }

  if (!runner.logs) { runner.logs = []; }
  runner.hooks = new Hooks({ logs: runner.logs, logger });

  if (!runner.hooks.transactions) { runner.hooks.transactions = {}; }

  Array.from(transactions).forEach((transaction) => {
    runner.hooks.transactions[transaction.name] = transaction;
  });

  // Loading hookfiles from fs
  const hookfiles = [].concat(runner.configuration.options.hookfiles || []);
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

  // If the language is empty or it is nodejs
  if (!runner.configuration.options.language
          || runner.configuration.options.language === 'nodejs') {
    // Load regular files from fs
    for (const file of files) {
      loadHookFile(file);
    }

    return callback();
  }

  // If other language than nodejs, run hooks worker client
  // Worker client will start the worker server and pass the "hookfiles" options as CLI arguments to it
  return (new HooksWorkerClient(runner)).start(callback);
}


module.exports = addHooks;
