
const winston = require('winston');


module.exports = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({colorize: true})
  ],
  levels: {
    silly: 14,
    debug: 13,
    verbose: 12,
    info: 11,
    test: 10,
    pass: 9,
    fail: 8,
    complete: 7,
    actual: 6,
    expected: 5,
    hook: 4,
    request: 3,
    skip: 2,
    warn: 1,
    error: 0
  },
  colors: {
    silly: 'gray',
    debug: 'cyan',
    verbose: 'magenta',
    info: 'blue',
    test: 'yellow',
    pass: 'green',
    fail: 'red',
    complete: 'green',
    actual: 'red',
    expected: 'red',
    hook: 'green',
    request: 'green',
    skip: 'yellow',
    warn: 'yellow',
    error: 'red'
  }
});
