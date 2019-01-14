const winston = require('winston');

module.exports = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({ colorize: true }),
  ],
  levels: {
    silly: 5,
    debug: 4,
    verbose: 3,
    info: 2,
    warn: 1,
    error: 0,
  },
  colors: {
    silly: 'gray',
    debug: 'cyan',
    verbose: 'magenta',
    info: 'blue',
    warn: 'yellow',
    error: 'red',
  },
});
