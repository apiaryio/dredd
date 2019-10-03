import clone from 'clone';
import { noCallThru } from 'proxyquire';

import Hooks from './Hooks';
import HooksWorkerClient from './HooksWorkerClient';
import logger from './logger';
import reporterOutputLogger from './reporters/reporterOutputLogger';
import resolvePaths from './resolvePaths';

const proxyquire = noCallThru();

// The 'addHooks()' function is a strange glue code responsible for various
// side effects needed as a preparation for loading Node.js hooks. It is
// asynchronous only because as the last thing, it spawns the hooks handler
// process if it figures out the hooks are not JavaScript hooks.
//
// In the future we should get rid of this code. Hooks should get a nice,
// separate logical component, which takes care of their loading and running
// regardless the language used, and either delegates to the hooks handler
// or not. Side effects should get eliminated as much as possible in favor
// of decoupling.

function loadHookFile(hookfile, hooks) {
  try {
    proxyquire(hookfile, { hooks });
  } catch (error) {
    logger.warn(
      `Skipping hook loading. Error reading hook file '${hookfile}'. ` +
        'This probably means one or more of your hook files are invalid.\n' +
        `Message: ${error.message}\n` +
        `Stack: \n${error.stack}\n`,
    );
  }
}

export default function addHooks(runner, transactions, callback) {
  if (!runner.logs) {
    runner.logs = [];
  }
  runner.hooks = new Hooks({ logs: runner.logs, logger: reporterOutputLogger });

  if (!runner.hooks.transactions) {
    runner.hooks.transactions = {};
  }

  Array.from(transactions).forEach((transaction) => {
    runner.hooks.transactions[transaction.name] = transaction;
  });

  // No hooks
  if (
    !runner.configuration.hookfiles ||
    !runner.configuration.hookfiles.length
  ) {
    return callback();
  }

  // Loading hookfiles from fs
  let hookfiles;
  try {
    hookfiles = resolvePaths(
      runner.configuration.custom.cwd,
      runner.configuration.hookfiles,
    );
  } catch (err) {
    return callback(err);
  }
  logger.debug('Found Hookfiles:', hookfiles);

  // Override hookfiles option in configuration object with
  // sorted and resolved files
  runner.configuration.hookfiles = hookfiles;

  // Clone the configuration object to hooks.configuration to make it
  // accessible in the node.js hooks API
  runner.hooks.configuration = clone(runner.configuration);

  // If the language is empty or it is nodejs
  if (
    !runner.configuration.language ||
    runner.configuration.language === 'nodejs'
  ) {
    hookfiles.forEach((hookfile) => loadHookFile(hookfile, runner.hooks));
    return callback();
  }

  // If other language than nodejs, run hooks worker client
  // Worker client will start the worker server and pass the "hookfiles" options as CLI arguments to it
  return new HooksWorkerClient(runner).start(callback);
}
