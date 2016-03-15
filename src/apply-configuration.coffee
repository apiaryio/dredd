{EventEmitter} = require 'events'
clone = require 'clone'

logger = require './logger'

coerceToArray = (value) ->
  if Array.isArray value
    return value
  else if typeof value is 'string'
    return [value]
  else if !value?
    return []
  else
    return value

applyConfiguration = (config) ->

  configuration =
    blueprintPath: null
    server: null
    emitter: new EventEmitter
    hooksCode: null
    custom: { # used for custom settings of various APIs or reporters
      # Keep commented-out, so these values are actually set by DreddCommand
      # cwd: process.cwd()
    }
    options:
      'dry-run': false
      silent: false
      reporter: null
      output: null
      debug: false
      header: null
      user: null
      'inline-errors':false
      details: false
      method: []
      only: []
      color: true
      level: 'info'
      timestamp: false
      sorted: false
      names: false
      hookfiles: null
      sandbox: false
      language: 'nodejs'
      'hooks-worker-timeout': 5000
      'hooks-worker-connect-timeout': 1500
      'hooks-worker-connect-retry': 500
      'hooks-worker-after-connect-wait': 100
      'hooks-worker-term-timeout': 5000
      'hooks-worker-term-retry': 500
      'hooks-worker-handler-host': 'localhost'
      'hooks-worker-handler-port': 61321


  # normalize options and config
  for own key, value of config
    # copy anything except "custom" hash
    if key isnt 'custom'
      configuration[key] = value
    else
      configuration['custom'] ?= {}
      for own customKey, customVal of config['custom'] or {}
        configuration['custom'][customKey] = clone customVal, false

  #coerce single/multiple options into an array
  configuration.options.reporter = coerceToArray(configuration.options.reporter)
  configuration.options.output = coerceToArray(configuration.options.output)
  configuration.options.header = coerceToArray(configuration.options.header)
  configuration.options.method = coerceToArray(configuration.options.method)
  configuration.options.only = coerceToArray(configuration.options.only)
  configuration.options.path = coerceToArray(configuration.options.path)

  # support for legacy JS API options
  if config.blueprintPath
    configuration.options.path.push config.blueprintPath

  # coerce color to bool
  if configuration.options.color == 'false'
    configuration.options.color = false
  else if configuration.options.color == 'true'
    configuration.options.color = true

  for method in configuration.options.method
    method.toUpperCase()

  if configuration.options.user?
    authHeader = 'Authorization:Basic ' + new Buffer(configuration.options.user).toString('base64')
    configuration.options.header.push authHeader

  logger.transports.console.colorize = configuration.options.color
  logger.transports.console.silent = configuration.options.silent
  logger.transports.console.level = configuration.options.level
  logger.transports.console.timestamp = configuration.options.timestamp
  logger.sys.transports.systemConsole.colorize = configuration.options.color
  logger.sys.transports.systemConsole.silent = configuration.options.silent
  logger.sys.transports.systemConsole.level = configuration.options.level
  logger.sys.transports.systemConsole.timestamp = configuration.options.timestamp

  return configuration

module.exports = applyConfiguration
