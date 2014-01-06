winston = require 'winston'

config =
  levels:
    test: 0
    info: 1
    pass: 2
    fail: 3
    complete: 4
    actual: 5
    expected: 6
    diff: 7
    request: 8
    skip: 9
    error: 10
  colors:
    test: 'yellow'
    info: 'blue'
    pass: 'green'
    fail: 'red'
    complete: 'green'
    actual: 'red'
    expected: 'red'
    diff: 'red'
    request: 'green'
    skip: 'yellow'
    error: 'red'


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
