util = require 'util'

hooksLog = (logs = [], logger, logVariant, content) ->
  if arguments.length is 4 and logVariant in ['info', 'debug', 'warn', 'verbose', 'error', 'log']
    loggerLevel = "#{logVariant}"
    loggerLevel = 'hook' if loggerLevel is 'log'
  else
    loggerLevel = 'hook'
    if arguments.length is 3
      content = logVariant

  # log to logger
  logger?[loggerLevel]? content

  # append to array of logs to allow further operations, e.g. send all hooks logs to Apiary
  logs?.push? {
    timestamp: Date.now()
    content: if typeof content is 'object' then util.format(content) else "#{content}"
  }
  return logs


module.exports = hooksLog
