winston = require 'winston'

config =
  levels:
    test: 0,
    info: 1,
    pass: 2,
    fail: 3,
    complete: 4
  colors:
    test: 'yellow',
    info: 'blue',
    pass: 'green',
    fail: 'red',
    complete: 'green'

logger = new (winston.Logger) ({
  transports: [
    new (winston.transports.Console)({
      colorize: true
    })
  ],
  levels: config.levels,
  colors: config.colors
})

module.exports = logger
