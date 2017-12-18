require('coffee-script/register');
const path = require('path');
const proxyquire = require('proxyquire').noCallThru();
const glob = require('glob');
const fs = require('fs');
const async = require('async');
const clone = require('clone');

const Hooks = require('./hooks');
const logger = require('./logger');
const sandboxHooksCode = require('./sandbox-hooks-code');
const mergeSandboxedHooks = require('./merge-sandboxed-hooks');
const HooksWorkerClient = require('./hooks-worker-client');

// Ensure platform agnostic path.basename function
const basename = process.platform === 'win32' ? path.win32.basename : path.basename;

const addHooks = function(runner, transactions, callback) {
  // Note: runner.configuration.options must be defined

  const customConfigCwd = __guard__(__guard__(runner != null ? runner.configuration : undefined, x1 => x1.custom), x => x.cwd);

  const fixLegacyTransactionNames = function(allHooks) {
    const pattern = /^\s>\s/g;
    return ['beforeHooks', 'afterHooks'].map((hookType) =>
      (() => {
        const result = [];
        for (let transactionName in allHooks[hookType]) {
          const hooks = allHooks[hookType][transactionName];
          if (transactionName.match(pattern) !== null) {
            const newTransactionName = transactionName.replace(pattern, '');
            if (allHooks[hookType][newTransactionName] !== undefined) {
              allHooks[hookType][newTransactionName] = hooks.concat(allHooks[hookType][newTransactionName]);
            } else {
              allHooks[hookType][newTransactionName] = hooks;
            }

            result.push(delete allHooks[hookType][transactionName]);
          } else {
            result.push(undefined);
          }
        }
        return result;
      })());
  };

  const loadHookFile = function(filePath) {
    try {
      proxyquire(filePath, {
        'hooks': runner.hooks
      });

      // Fixing #168 issue
      return fixLegacyTransactionNames(runner.hooks);

    } catch (error) {
      return logger.warn(`\
Skipping hook loading. Error reading hook file '${filePath}'. \
This probably means one or more of your hook files are invalid.
Message: ${error.message}
Stack: ${error.stack}\
`);
    }
  };

  const loadSandboxHooksFromStrings = function(callback) {
    if ((typeof(runner.configuration.hooksData) !== 'object') || (Array.isArray(runner.configuration.hooksData) !== false)) {
      return callback(new Error("hooksData option must be an object e.g. {'filename.js':'console.log(\"Hey!\")'}"));
    }

    // Run code in sandbox
    return async.eachSeries(Object.keys(runner.configuration.hooksData), function(key, nextHook) {
      const data = runner.configuration.hooksData[key];

      // Run code in sandbox
      return sandboxHooksCode(data, function(sandboxError, result) {
        if (sandboxError) { return nextHook(sandboxError); }

        // Merge stringified hooks
        runner.hooks = mergeSandboxedHooks(runner.hooks, result);

        // Fixing #168 issue
        fixLegacyTransactionNames(runner.hooks);

        return nextHook();
      });
    }

    , callback);
  };

  if (runner.logs == null) { runner.logs = []; }
  runner.hooks = new Hooks({logs: runner.logs, logger});
  if (runner.hooks.transactions == null) { runner.hooks.transactions = {}; }

  for (let transaction of transactions) {
    runner.hooks.transactions[transaction.name] = transaction;
  }

  // Loading hooks from string, sandbox mode must be enabled
  if (!__guard__(__guard__(runner != null ? runner.configuration : undefined, x3 => x3.options), x2 => x2.hookfiles)) {
    if (runner.configuration.hooksData != null) {

      if (runner.configuration.options.sandbox === true) {
        return loadSandboxHooksFromStrings(callback);
      } else {
        // not sandboxed code can't be loaded from the string
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
    const hookfiles = [].concat(__guard__(runner.configuration != null ? runner.configuration.options : undefined, x4 => x4.hookfiles));
    const files = hookfiles.reduce(function(result, unresolvedPath) {
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
        .map(filepath => ({basename: basename(filepath), path: filepath}))
        // Sort 'em up
        .sort(function(a, b) { switch (false) {
          case !(a.basename < b.basename): return -1;
          case !(a.basename > b.basename): return 1;
          default: return 0;
        }
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
    runner.hooks.configuration = clone(runner != null ? runner.configuration : undefined);

    // Override hookfiles option in configuration object with
    // sorted and resolved files
    runner.hooks.configuration.options.hookfiles = files;

    // Loading files in non sandboxed nodejs
    if (!runner.configuration.options.sandbox === true) {

      // If the language is empty or it is nodejs
      if ((__guard__(__guard__(runner != null ? runner.configuration : undefined, x6 => x6.options), x5 => x5.language) === "") ||
      (__guard__(__guard__(runner != null ? runner.configuration : undefined, x8 => x8.options), x7 => x7.language) === undefined) ||
      (__guard__(__guard__(runner != null ? runner.configuration : undefined, x10 => x10.options), x9 => x9.language) === "nodejs")) {

        // Load regular files from fs
        for (let file of files) {
          loadHookFile(file);
        }

        return callback();

      // If other language than nodejs, run hooks worker client
      // Worker client will start the worker server and pass the "hookfiles" options as CLI arguments to it
      } else {
        // Start hooks worker
        const hooksWorkerClient = new HooksWorkerClient(runner);
        return hooksWorkerClient.start(callback);
      }

    // Loading files in sandboxed mode
    } else {

      // Load sandbox files from fs
      logger.info('Loading hook files in sandboxed context:', files);
      return async.eachSeries(files, (resolvedPath, nextFile) =>
        // Load hook file content
        fs.readFile(resolvedPath, 'utf8', function(readingError, data) {
          if (readingError) { return nextFile(readingError); }
          // Run code in sandbox
          return sandboxHooksCode(data, function(sandboxError, result) {
            if (sandboxError) { return nextFile(sandboxError); }
            runner.hooks = mergeSandboxedHooks(runner.hooks, result);

            // Fixing #168 issue
            fixLegacyTransactionNames(runner.hooks);

            return nextFile();
          });
        })
      
      , callback);
    }
  }
};



module.exports = addHooks;

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}