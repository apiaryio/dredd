require('coffee-script/register');

const async = require('async');
const clone = require('clone');
const glob = require('glob');
const fs = require('fs');
const path = require('path');
const proxyquire = require('proxyquire').noCallThru();

const Hooks = require('./hooks');
const HooksWorkerClient = require('./hooks-worker-client');
const logger = require('./logger');
const mergeSandboxedHooks = require('./merge-sandboxed-hooks');
const sandboxHooksCode = require('./sandbox-hooks-code');

// Ensure platform agnostic path.basename function
const basename = process.platform === 'win32' ? path.win32.basename : path.basename;

function addHooks(runner, transactions, callback) {
  const customConfigCwd = (runner && runner.configuration && runner.configuration.custom) ?
    runner.configuration.custom.cwd :
    undefined;

  function fixLegacyTransactionNames(hooks) {
    let hooksWithFixedTransactionNames = {
      'beforeHooks': {},
      'afterHooks': {}
    };

    ['beforeHooks', 'afterHooks'].forEach((hookType) => {
      const pattern = /^\s>\s/g;

      Object.keys(hooks[hookType]).forEach(transactionName => {
        const transactionHooks = hooks[hookType][transactionName];
        if (transactionName.match(pattern)) {
          const newTransactionName = transactionName.replace(pattern, '');
          hooksWithFixedTransactionNames[hookType][newTransactionName] = transactionHooks;
        } else {
          hooksWithFixedTransactionNames[hookType][transactionName] = transactionHooks;
        }
      });
    });

    return Object.assign({}, hooks, hooksWithFixedTransactionNames);
  }

  function loadHookFile(filePath) {
    try {
      proxyquire(filePath, {
        'hooks': runner.hooks
      });

      // Fixing #168 issue
      runner.hooks = fixLegacyTransactionNames(runner.hooks);

    } catch (error) {
      return logger.warn(`\
Skipping hook loading. Error reading hook file '${filePath}'. \
This probably means one or more of your hook files are invalid.
Message: ${error.message}
Stack: ${error.stack}\
`);
    }
  }

  function loadSandboxHooksFromStrings(callback) {
    const isHooksDataCorrect = (
      typeof runner.configuration.hooksData === 'object' ||
      !Array.isArray(runner.configuration.hooksData)
    );

    if (!isHooksDataCorrect) {
      return callback(
        new Error('hooksData option must be an object e.g. {"filename.js":"console.log("Hey!")"}')
      );
    }

    // Run code in sandbox
    return async.eachSeries(Object.keys(runner.configuration.hooksData), (key, nextHook) => {
      const data = runner.configuration.hooksData[key];

      // Run code in sandbox
      return sandboxHooksCode(data, (sandboxError, result) => {
        if (sandboxError) { return nextHook(sandboxError); }

        // Merge stringified hooks
        runner.hooks = mergeSandboxedHooks(runner.hooks, result);

        // Fixing #168 issue
        runner.hooks = fixLegacyTransactionNames(runner.hooks);

        return nextHook();
      });
    }
    , callback);
  };

  if (!runner.logs) { runner.logs = []; }
  runner.hooks = new Hooks({ logs: runner.logs, logger });
  
  if (!runner.hooks.transactions) { runner.hooks.transactions = {}; }

  Array.from(transactions).forEach((transaction) => {
    runner.hooks.transactions[transaction.name] = transaction;
  });

  // Loading hooks from string, sandbox mode must be enabled
  if (!(runner && runner.configuration && runner.configuration.options &&
        runner.configuration.options.hookfiles)) {

    if (runner.configuration.hooksData) {
      if (runner.configuration.options.sandbox === true) {
        return loadSandboxHooksFromStrings(callback);
      } else {
        // Not sandboxed code can't be loaded from the string
        const msg = `\
  Not sandboxed hooks loading from strings is not implemented, \
  Sandbox mode must be enabled when loading hooks from strings.\
  `;
        return callback(new Error(msg));
      }
    } else {
      // No data found, doing nothing
      return callback();
    }

  // Loading hookfiles from fs
  } else {
    // Expand hookfiles - sort files alphabetically and resolve their paths
    const hookfiles = [].concat(runner.configuration.options.hookfiles);
    const files = hookfiles.reduce((result, unresolvedPath) => {
      // glob.sync does not resolve paths, only glob patterns
      const unresolvedPaths = glob.hasMagic(unresolvedPath) ? glob.sync(unresolvedPath) : [unresolvedPath];

      // Gradually append sorted and resolved paths
      return result.concat(unresolvedPaths)
        // Create a filename / filepath map for easier sorting
        // Example:
        // [
        //   { basename: 'filename1.coffee', path: './path/to/filename1.coffee' }
        //   { basename: 'filename2.coffee', path: './path/to/filename2.coffee' }
        // ]
        .map(filepath => ({ basename: basename(filepath), path: filepath }))
        // Sort 'em up
        .sort((a, b) => { 
          if (a.basename < b.basename) return -1;
          if (a.basename > b.basename) return 1;
          return 0;
         })
        // Resolve paths to absolute form. Take into account user defined current
        // working directory, fallback to process.cwd() otherwise
        .map(item => path.resolve(customConfigCwd || process.cwd(), item.path));
    }
    , [] // Start with empty result
    );

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
      if (!runner.configuration.options.language ||
           runner.configuration.options.language === 'nodejs') {

        // Load regular files from fs
        for (let file of files) {
          loadHookFile(file);
        }

        return callback();

      // If other language than nodejs, run hooks worker client
      // Worker client will start the worker server and pass the "hookfiles" options as CLI arguments to it
      } else {
        // Start hooks worker
        return (new HooksWorkerClient(runner)).start(callback);
      }

    // Loading files in sandboxed mode
    } else {
      // Load sandbox files from fs
      logger.info('Loading hook files in sandboxed context:', files);

      return async.eachSeries(files, (resolvedPath, nextFile) =>
        // Load hook file content
        fs.readFile(resolvedPath, 'utf8', (readingError, data) => {
          if (readingError) { return nextFile(readingError); }
          // Run code in sandbox
          sandboxHooksCode(data, (sandboxError, result) => {
            if (sandboxError) { return nextFile(sandboxError); }
            runner.hooks = mergeSandboxedHooks(runner.hooks, result);

            // Fixing #168 issue
            runner.hooks = fixLegacyTransactionNames(runner.hooks);

            return nextFile();
          });
        })
      , callback);
    }
  }
};

module.exports = addHooks;
