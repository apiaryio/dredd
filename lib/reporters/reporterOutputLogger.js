const winston = require('winston');

winston.addColors({
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
  error: 'red',
});

module.exports = new (winston.Logger)({
  transports: [winston.transports.Console({ level: 'info' })],
  format: winston.format.combine(
    // winston.format.colorize(),
    winston.format.splat(),
    winston.format.simple()
  ),
  levels: {
    info: 10,
    test: 9,
    pass: 8,
    fail: 7,
    complete: 6,
    actual: 5,
    expected: 4,
    hook: 3,
    request: 2,
    skip: 1,
    error: 0,
  },
});
