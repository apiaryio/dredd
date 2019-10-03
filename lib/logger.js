import winston from 'winston';

const logger = new winston.Logger({
  transports: [new winston.transports.Console({ colorize: true })],
  levels: {
    debug: 2,
    warn: 1,
    error: 0,
  },
  colors: {
    debug: 'cyan',
    warn: 'yellow',
    error: 'red',
  },
});

export default logger;
