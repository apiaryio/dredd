const hooksLog = require('./hooksLog');

// Sandboxed hooks cannot access "console" or system logger
const logger = null;

// Sandboxed 'log' function
// - "logs" must be an Array
module.exports = function hooksLogSandboxed(logs = [], content) {
  logs = hooksLog(logs, logger, content);
  return logs;
};
