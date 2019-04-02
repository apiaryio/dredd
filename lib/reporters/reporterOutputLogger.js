const { createLogger, transports, format } = require('winston');

module.exports = createLogger({
  transports: [
    new transports.Console({ colorize: true, level: 'info' }),
  ],
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
  format: format.colorize({
    colors: {
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
    },
  }),
});
