/* eslint-disable
    no-return-assign,
    no-shadow,
    no-unused-vars,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
const clone = require('clone');
const https = require('https');
const async = require('async');
const fs = require('fs');
const path = require('path');
const express = require('express');
const spawn = require('cross-spawn');
const bodyParser = require('body-parser');
const ps = require('ps-node');

const logger = require('../../src/logger');


const DEFAULT_SERVER_PORT = 9876;
const DREDD_BIN = require.resolve('../../bin/dredd');


// Records logging during runtime of a given function. Given function
// is provided with a 'next' callback. The final callback is provided
// with:
//
// - err (Error) - in case the recordLogging function failed (never)
// - args (array) - array of all arguments the 'next' callback obtained
//                  from the 'fn' function
// - logging (string) - the recorded logging output
const recordLogging = function (fn, callback) {
  const silent = !!logger.transports.console.silent;
  logger.transports.console.silent = true; // supress Dredd's console output (remove if debugging)

  let logging = '';
  const record = (transport, level, message, meta) => logging += `${level}: ${message}\n`;

  logger.on('logging', record);
  return fn((...args) => {
    logger.removeListener('logging', record);
    logger.transports.console.silent = silent;
    return callback(null, args, logging);
  });
};


// Helper function which records incoming server request to given
// server runtime info object.
const recordServerRequest = function (serverRuntimeInfo, req) {
  // Initial values before any request is made:
  // - requestedOnce = false
  // - requested = false
  serverRuntimeInfo.requestedOnce = !serverRuntimeInfo.requested;
  serverRuntimeInfo.requested = true;

  const recordedReq = {
    method: req.method,
    url: req.url,
    headers: clone(req.headers),
    body: clone(req.body)
  };

  serverRuntimeInfo.lastRequest = recordedReq;

  if (serverRuntimeInfo.requests[req.url] == null) { serverRuntimeInfo.requests[req.url] = []; }
  serverRuntimeInfo.requests[req.url].push(recordedReq);

  if (serverRuntimeInfo.requestCounts[req.url] == null) { serverRuntimeInfo.requestCounts[req.url] = 0; }
  return serverRuntimeInfo.requestCounts[req.url] += 1;
};


// Helper to get SSL credentials. Uses dummy self-signed certificate.
const getSSLCredentials = function () {
  const httpsDir = path.join(__dirname, '../fixtures/https');
  return {
    key: fs.readFileSync(path.join(httpsDir, 'server.key'), 'utf8'),
    cert: fs.readFileSync(path.join(httpsDir, 'server.crt'), 'utf8')
  };
};


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
const createServer = function (options = {}) {
  const protocol = options.protocol || 'http';
  const bodyParserInstance = options.bodyParser || bodyParser.json({ size: '5mb' });

  const serverRuntimeInfo = {
    requestedOnce: false,
    requested: false,
    lastRequest: null,
    requests: {},
    requestCounts: {}
  };

  let app = express();
  app.use(bodyParserInstance);
  app.use((req, res, next) => {
    recordServerRequest(serverRuntimeInfo, req);
    res.type('json').status(200); // sensible defaults, can be overriden
    return next();
  });
  if (protocol === 'https') { app = https.createServer(getSSLCredentials(), app); }

  // Monkey-patching the app.listen() function. The 'port' argument
  // is made optional, defaulting to the 'DEFAULT_SERVER_PORT' value.
  // The callback is provided not only with error object, but also with
  // runtime info about the server (what requests it got etc.).
  const { listen } = app;
  app.listen = function (port, callback) {
    if (typeof port === 'function') { [callback, port] = Array.from([port, DEFAULT_SERVER_PORT]); }
    return listen.call(this, port, err => callback(err, serverRuntimeInfo));
  };
  return app;
};


// Runs given Dredd class instance against localhost server on given (or default)
// server port. Automatically records all Dredd logging ouput. The error isn't passed
// as the first argument, but as part of the result, which is convenient in
// tests. Except of 'err' and 'logging' returns also 'stats' which is what the Dredd
// instance returns as test results.
const runDredd = function (dredd, serverPort, callback) {
  if (typeof serverPort === 'function') { [callback, serverPort] = Array.from([serverPort, DEFAULT_SERVER_PORT]); }
  if (dredd.configuration.server == null) { dredd.configuration.server = `http://127.0.0.1:${serverPort}`; }

  if (dredd.configuration.options == null) { dredd.configuration.options = {}; }
  if (dredd.configuration.options.level == null) { dredd.configuration.options.level = 'silly'; }

  const err = undefined;
  let stats;

  return recordLogging(next => dredd.run(next)
    , (err, args, logging) => {
      if (err) { return callback(err); }

      [err, stats] = Array.from(args);
      return callback(null, { err, stats, logging });
    });
};


// Runs given Express.js server instance and then runs given Dredd class instance.
// Collects their runtime information and provides it to the callback.
const runDreddWithServer = function (dredd, app, serverPort, callback) {
  let server;
  if (typeof serverPort === 'function') { [callback, serverPort] = Array.from([serverPort, DEFAULT_SERVER_PORT]); }

  return server = app.listen(serverPort, (err, serverRuntimeInfo) => {
    if (err) { return callback(err); }

    return runDredd(dredd, serverPort, (err, dreddRuntimeInfo) =>
      server.close(() => callback(err, { server: serverRuntimeInfo, dredd: dreddRuntimeInfo }))
    );
  });
};


// Runs CLI command with given arguments. Records and provides stdout, stderr
// and also 'output', which is the two combined. Also provides 'exitStatus'
// of the process.
const runCommand = function (command, args, spawnOptions = {}, callback) {
  if (typeof spawnOptions === 'function') { [callback, spawnOptions] = Array.from([spawnOptions, undefined]); }

  let stdout = '';
  let stderr = '';
  let output = '';

  const cli = spawn(command, args, spawnOptions);

  cli.stdout.on('data', (data) => {
    stdout += data;
    return output += data;
  });
  cli.stderr.on('data', (data) => {
    stderr += data;
    return output += data;
  });

  return cli.on('exit', exitStatus => callback(null, { stdout, stderr, output, exitStatus }));
};


// Runs Dredd as a CLI command, with given arguments.
const runDreddCommand = (args, spawnOptions, callback) => runCommand('node', [DREDD_BIN].concat(args), spawnOptions, callback);


// Runs given Express.js server instance and then runs Dredd command with given
// arguments. Collects their runtime information and provides it to the callback.
const runDreddCommandWithServer = function (args, app, serverPort, callback) {
  let server;
  if (typeof serverPort === 'function') { [callback, serverPort] = Array.from([serverPort, DEFAULT_SERVER_PORT]); }

  return server = app.listen(serverPort, (err, serverRuntimeInfo) => {
    if (err) { return callback(err); }

    return runDreddCommand(args, (err, dreddCommandInfo) =>
      server.close(() => callback(err, { server: serverRuntimeInfo, dredd: dreddCommandInfo }))
    );
  });
};


// Checks whether there's a process with name matching given pattern.
const isProcessRunning = function (pattern, callback) {
  return ps.lookup({ arguments: pattern }, (err, processList) => callback(err, !!(processList != null ? processList.length : undefined)));
};


// Kills process with given PID if the process exists. Otherwise
// does nothing.
const kill = function (pid, callback) {
  if (process.platform === 'win32') {
    const taskkill = spawn('taskkill', ['/F', '/T', '/PID', pid]);
    return taskkill.on('exit', () => callback());
    // no error handling - we don't care about the result of the command
  }
  try {
    process.kill(pid, 'SIGKILL');
  } catch (error) {}
  // if the PID doesn't exist, process.kill() throws - we do not care
  return process.nextTick(callback);
};


// Kills processes which have names matching given pattern. Does
// nothing if there are no matching processes.
const killAll = function (pattern, callback) {
  return ps.lookup({ arguments: pattern }, (err, processList) => {
    if (err || !processList.length) { return callback(err); }

    return async.each(processList, (processListItem, next) => kill(processListItem.pid, next)
      , callback);
  });
};


module.exports = {
  DEFAULT_SERVER_PORT,
  recordLogging,
  createServer,
  runDredd,
  runDreddWithServer,
  runDreddCommand,
  runDreddCommandWithServer,
  isProcessRunning,
  kill,
  killAll
};
