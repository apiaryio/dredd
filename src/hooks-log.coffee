util = require 'util'

hooksLog = (logs = [], logger, content) ->

  # log to logger
  logger?.hook? content

  # append to array of logs to allow further operations, e.g. send all hooks logs to Apiary
  logs?.push? {
    timestamp: Date.now()
    content: if typeof content is 'object' then util.format(content) else "#{content}"
  }
  return logs


module.exports = hooksLog
