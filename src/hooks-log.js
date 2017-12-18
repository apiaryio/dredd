// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
const util = require('util');

const hooksLog = function(logs = [], logger, content) {

  // log to logger
  __guardMethod__(logger, 'hook', o => o.hook(content));

  // append to array of logs to allow further operations, e.g. send all hooks logs to Apiary
  __guardMethod__(logs, 'push', o1 => o1.push({
    timestamp: Date.now(),
    content: typeof content === 'object' ? util.format(content) : `${content}`
  }));
  return logs;
};


module.exports = hooksLog;

function __guardMethod__(obj, methodName, transform) {
  if (typeof obj !== 'undefined' && obj !== null && typeof obj[methodName] === 'function') {
    return transform(obj, methodName);
  } else {
    return undefined;
  }
}