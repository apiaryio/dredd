const winston = require('winston');

module.exports = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({ colorize: true }),
  ],
  levels: {
    debug: 5,
    silly: 4,
    verbose: 3,
    info: 2,
    warn: 1,
    error: 0,
  },
  colors: {
    debug: 'cyan',
    silly: 'gray',
    verbose: 'magenta',
    info: 'blue',
    warn: 'yellow',
    error: 'red',
  },
});
