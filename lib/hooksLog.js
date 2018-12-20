const util = require('util');

module.exports = function hooksLog(logs = [], logger, content) {
  // Log to logger
  if (logger && typeof logger.hook === 'function') { logger.hook(content); }

  // Append to array of logs to allow further operations, e.g. send all hooks logs to Apiary
  logs.push({
    timestamp: Date.now(),
    content: typeof content === 'object' ? util.format(content) : `${content}`,
  });

  return logs;
};
