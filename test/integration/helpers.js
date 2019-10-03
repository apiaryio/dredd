import async from 'async';
import bodyParser from 'body-parser';
import clone from 'clone';
import express from 'express';
import fs from 'fs';
import https from 'https';
import path from 'path';
import ps from 'ps-node';
import spawn from 'cross-spawn';

import logger from '../../lib/logger';
import reporterOutputLogger from '../../lib/reporters/reporterOutputLogger';

export const DEFAULT_SERVER_PORT = 9876;
const DREDD_BIN = require.resolve('../../bin/dredd');

// Records logging during runtime of a given function. Given function
// is provided with a 'next' callback. The final callback is provided
// with:
//
// - err (Error) - in case the recordLogging function failed (never)
// - args (array) - array of all arguments the 'next' callback obtained
//                  from the 'fn' function
// - logging (string) - the recorded logging output
export const recordLogging = (fn, callback) => {
  const loggerSilent = !!logger.transports.console.silent;
  const reporterOutputLoggerSilent = !!reporterOutputLogger.transports.console
    .silent;

  // Supress Dredd's console output (remove if debugging)
  logger.transports.console.silent = true;
  reporterOutputLogger.transports.console.silent = true;

  let logging = '';
  const record = (transport, level, message) => {
    logging += `${level}: ${message}\n`;
  };

  logger.on('logging', record);
  reporterOutputLogger.on('logging', record);

  fn((...args) => {
    logger.removeListener('logging', record);
    logger.transports.console.silent = loggerSilent;

    reporterOutputLogger.removeListener('logging', record);
    reporterOutputLogger.transports.console.silent = reporterOutputLoggerSilent;

    callback(null, args, logging);
  });
};

// Helper function which records incoming server request to given
// server runtime info object.
function recordServerRequest(serverRuntimeInfo, req) {
  // Initial values before any request is made:
  // - requestedOnce = false
  // - requested = false
  serverRuntimeInfo.requestedOnce = !serverRuntimeInfo.requested;
  serverRuntimeInfo.requested = true;

  const recordedReq = {
    method: req.method,
    url: req.url,
    headers: clone(req.headers),
    body: clone(req.body),
  };

  serverRuntimeInfo.lastRequest = recordedReq;

  if (!serverRuntimeInfo.requests[req.url]) {
    serverRuntimeInfo.requests[req.url] = [];
  }
  serverRuntimeInfo.requests[req.url].push(recordedReq);

  if (!serverRuntimeInfo.requestCounts[req.url]) {
    serverRuntimeInfo.requestCounts[req.url] = 0;
  }
  serverRuntimeInfo.requestCounts[req.url] += 1;
}

// Helper to get SSL credentials. Uses dummy self-signed certificate.
function getSSLCredentials() {
  const httpsDir = path.join(__dirname, '../fixtures/https');
  return {
    key: fs.readFileSync(path.join(httpsDir, 'server.key'), 'utf8'),
    cert: fs.readFileSync(path.join(httpsDir, 'server.crt'), 'utf8'),
  };
}

// Creates a new Express.js instance. Automatically records everything about
// requests which the server has recieved during runtime. Sets JSON body parser
// and 'application/json' as default value for the Content-Type header. In
// callback of the listen() function it additionally provides server runtime
// information (useful for inspecting in tests):
//
// - process (object) - the server process object (has the .close() method)
// - requested (boolean) - whether the server recieved at least one request
// - requests (object) - recorded requests
//     - *endpointUrl* (array)
//         - (object)
//             - method: GET (string)
//             - headers (object)
//             - body (string)
// - requestCounts (object)
//     - *endpointUrl*: 0 (number, default) - number of requests to the endpoint
export const createServer = (options = {}) => {
  const protocol = options.protocol || 'http';
  const bodyParserInstance =
    options.bodyParser || bodyParser.json({ size: '5mb' });

  const serverRuntimeInfo = {
    requestedOnce: false,
    requested: false,
    lastRequest: null,
    requests: {},
    requestCounts: {},
    reset: function reset() {
      this.requestedOnce = false;
      this.requested = false;
      this.lastRequest = null;
      this.requests = {};
      this.requestCounts = {};
    },
  };

  let app = express();
  app.use(bodyParserInstance);
  app.use((req, res, next) => {
    recordServerRequest(serverRuntimeInfo, req);
    res.type('json').status(200); // sensible defaults, can be overriden
    next();
  });
  if (protocol === 'https') {
    app = https.createServer(getSSLCredentials(), app);
  }

  // Monkey-patching the app.listen() function. The 'port' argument
  // is made optional, defaulting to the 'DEFAULT_SERVER_PORT' value.
  // The callback is provided not only with error object, but also with
  // runtime info about the server (what requests it got etc.).
  const originalListen = app.listen;
  app.listen = function listen(port, callback) {
    if (typeof port === 'function') {
      [callback, port] = Array.from([port, DEFAULT_SERVER_PORT]);
    }
    return originalListen.call(this, port, (err) =>
      callback(err, serverRuntimeInfo),
    );
  };
  return app;
};

// Runs given Dredd class instance against localhost server on given (or default)
// server port. Automatically records all Dredd logging ouput. The error isn't passed
// as the first argument, but as part of the result, which is convenient in
// tests. Except of 'err' and 'logging' returns also 'stats' which is what the Dredd
// instance returns as test results.
export const runDredd = (dredd, serverPort, callback) => {
  if (typeof serverPort === 'function') {
    [callback, serverPort] = Array.from([serverPort, DEFAULT_SERVER_PORT]);
  }
  if (dredd.configuration.endpoint == null) {
    dredd.configuration.endpoint = `http://127.0.0.1:${serverPort}`;
  }

  if (dredd.configuration.options == null) {
    dredd.configuration.options = {};
  }
  if (dredd.configuration.options.loglevel == null) {
    dredd.configuration.options.loglevel = 'debug';
  }

  let stats;

  recordLogging(
    (next) => dredd.run(next),
    (err, args, logging) => {
      if (err) {
        return callback(err);
      }

      [err, stats] = Array.from(args);
      callback(null, { err, stats, logging });
    },
  );
};

// Runs given Express.js server instance and then runs given Dredd class instance.
// Collects their runtime information and provides it to the callback.
export const runDreddWithServer = (dredd, app, serverPort, callback) => {
  if (typeof serverPort === 'function') {
    [callback, serverPort] = Array.from([serverPort, DEFAULT_SERVER_PORT]);
  }

  const server = app.listen(serverPort, (err, serverRuntimeInfo) => {
    if (err) {
      return callback(err);
    }

    runDredd(dredd, serverPort, (error, dreddRuntimeInfo) =>
      server.close(() =>
        callback(error, { server: serverRuntimeInfo, dredd: dreddRuntimeInfo }),
      ),
    );
  });
};

// Runs CLI command with given arguments. Records and provides stdout, stderr
// and also 'output', which is the two combined. Also provides 'exitStatus'
// of the process.
function runCommand(command, args, spawnOptions = {}, callback) {
  if (typeof spawnOptions === 'function') {
    [callback, spawnOptions] = Array.from([spawnOptions, undefined]);
  }

  let stdout = '';
  let stderr = '';
  let output = '';

  const cli = spawn(command, args, spawnOptions);

  cli.stdout.on('data', (data) => {
    stdout += data;
    output += data;
  });
  cli.stderr.on('data', (data) => {
    stderr += data;
    output += data;
  });

  cli.on('exit', (exitStatus) =>
    callback(null, {
      stdout,
      stderr,
      output,
      exitStatus,
    }),
  );
}

// Runs Dredd as a CLI command, with given arguments.
export const runCLI = (args, spawnOptions, callback) =>
  runCommand('node', [DREDD_BIN].concat(args), spawnOptions, callback);

// Runs given Express.js server instance and then runs Dredd command with given
// arguments. Collects their runtime information and provides it to the callback.
export const runCLIWithServer = (args, app, serverPort, callback) => {
  if (typeof serverPort === 'function') {
    [callback, serverPort] = Array.from([serverPort, DEFAULT_SERVER_PORT]);
  }

  const server = app.listen(serverPort, (err, serverRuntimeInfo) => {
    if (err) {
      return callback(err);
    }

    runCLI(args, (error, cliInfo) =>
      server.close(() =>
        callback(error, { server: serverRuntimeInfo, dredd: cliInfo }),
      ),
    );
  });
};

// Checks whether there's a process with name matching given pattern.
export const isProcessRunning = (pattern, callback) => {
  return ps.lookup({ arguments: pattern }, (err, processList) =>
    callback(err, !!(processList ? processList.length : undefined)),
  );
};

// Kills process with given PID if the process exists. Otherwise
// does nothing.
export const kill = (pid, callback) => {
  if (process.platform === 'win32') {
    const taskkill = spawn('taskkill', ['/F', '/T', '/PID', pid]);
    return taskkill.on('exit', () => callback());
    // No error handling - we don't care about the result of the command
  }
  try {
    process.kill(pid, 'SIGKILL');
  } catch (error) {}
  // If the PID doesn't exist, process.kill() throws - we do not care
  process.nextTick(callback);
};

// Kills processes which have names matching given pattern. Does
// nothing if there are no matching processes.
export const killAll = (pattern, callback) => {
  return ps.lookup({ arguments: pattern }, (err, processList) => {
    if (err || !processList.length) {
      return callback(err);
    }

    async.each(
      processList,
      (processListItem, next) => kill(processListItem.pid, next),
      callback,
    );
  });
};
