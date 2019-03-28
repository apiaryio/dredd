const { createLogger, transports, format } = require('winston');

module.exports = new createLogger({
  transports: [
    new transports.Console({ colorize: true }),
  ],
  levels: {
    debug: 2,
    warn: 1,
    error: 0,
  },
  format: format.colorize({
    colors: {
      debug: 'cyan',
      warn: 'yellow',
      error: 'red',
    },
  }),
});
