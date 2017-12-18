// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
const hooksLog = require('./hooks-log');

// sandboxed hooks cannot access "console" or system logger
const logger = null;

// sandboxed 'log' function
// - "logs" must be an Array
const hooksLogSandboxed = function(logs = [], content) {
  logs = hooksLog(logs, logger, content);
  return logs;
};

module.exports = hooksLogSandboxed;
