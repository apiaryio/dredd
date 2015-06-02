winston = require 'winston'

config =
  levels:
    silly: 0
    debug: 1
    verbose: 2
    info: 3
    test: 4
    pass: 5
    fail: 6
    complete: 7
    actual: 8
    expected: 9
    hook: 10
    request: 11
    skip: 12
    warn: 13
    error: 14
  syslevels:
    silly: 0
    debug: 1
    verbose: 2
    info: 3
    warn: 4
    error: 5
  colors:
    test: 'yellow'
    info: 'blue'
    pass: 'green'
    fail: 'red'
    complete: 'green'
    actual: 'red'
    expected: 'red'
    hook: 'green'
    request: 'green'
    skip: 'yellow'
    error: 'red'
    warning: 'yellow'
    silly: 'magenta'
    verbose: 'cyan'
    debug: 'blue'

consoleTransport = new (winston.transports.Console)({
  colorize: true
})

sysConsoleTransport = new (winston.transports.Console)({
  name: 'systemConsole'
  colorize: true
})

logger = new (winston.Logger) ({
  transports: [
    consoleTransport
  ]
  levels: config.levels
  colors: config.colors
})

syslogger = new (winston.Logger) ({
  transports: [
    sysConsoleTransport
  ]
  levels: winston.config.npm.levels
  colors: config.colors
})

module.exports = logger
module.exports.sys = syslogger
