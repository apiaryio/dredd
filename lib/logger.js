const winston = require('winston');

const colors = {
  debug: 'cyan',
  warn: 'yellow',
  error: 'red',
};

const console = new winston.transports.Console({ level: 'warn' });

module.exports = winston.createLogger({
  transports: [console],
  exceptionHandlers: [console],
  format: winston.format.combine(
    // winston.format.timestamp(),
    // winston.format.colorize({ colors }),
    winston.format.splat(),
    winston.format.simple()
  ),
  levels: {
    debug: 2,
    warn: 1,
    error: 0,
  },
});
