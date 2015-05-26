hooksLog = require './hooks-log'

# sandboxed hooks cannot access "console" or system logger
logger = null

# sandboxed 'log' function
# - "logs" must be an Array
hooksLogSandboxed = (logs = [], args...) ->
  logs = hooksLog logs, logger, args...
  return logs

module.exports = hooksLogSandboxed
