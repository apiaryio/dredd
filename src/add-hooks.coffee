require 'coffee-script/register'
path = require 'path'
proxyquire = require('proxyquire').noCallThru()
glob = require 'glob'
fs = require 'fs'
async = require 'async'

Hooks = require './hooks'
logger = require './logger'
sandboxHooksCode = require './sandbox-hooks-code'
mergeSandboxedHooks = require './merge-sandboxed-hooks'

addHooks = (runner, transactions, callback) ->
  # Note: runner.configuration.options must be defined

  fixLegacyTransactionNames = (allHooks) ->
    pattern = /^\s>\s/g
    for hookType in ['beforeHooks', 'afterHooks']
      for transactionName, hooks of allHooks[hookType]
        if transactionName.match(pattern) != null
          newTransactionName = transactionName.replace(pattern, '')
          if allHooks[hookType][newTransactionName] != undefined
            allHooks[hookType][newTransactionName] = hooks.concat allHooks[hookType][newTransactionName]
          else
            allHooks[hookType][newTransactionName] = hooks

          delete allHooks[hookType][transactionName]

  runner.logs ?= []
  runner.hooks = new Hooks(logs: runner.logs, logger: logger)
  runner.hooks.transactions ?= {}

  customConfigCwd = runner?.configuration?.custom?.cwd

  for transaction in transactions
    runner.hooks.transactions[transaction.name] = transaction

  pattern = runner?.configuration?.options?.hookfiles
  if not pattern
    if runner.configuration.hooksData?
      if runner.configuration.options.sandbox == true
        if typeof(runner.configuration.hooksData) != 'object' or Array.isArray(runner.configuration.hooksData) != false
          return callback(new Error("hooksData option must be an object e.g. {'filename.js':'console.log(\"Hey!\")'}"))

        # run code in sandbox
        async.eachSeries Object.keys(runner.configuration.hooksData), (key, nextHook) ->
          data = runner.configuration.hooksData[key]

          # run code in sandbox
          sandboxHooksCode data, (sandboxError, result) ->
            return nextHook(sandboxError) if sandboxError

            # merge stringified hooks
            runner.hooks = mergeSandboxedHooks(runner.hooks, result)

            # Fixing #168 issue
            fixLegacyTransactionNames runner.hooks

            nextHook()

        , callback
      else
        msg = """
        Not sandboxed hooks loading from strings is not implemented,
        Sandbox mode must be enabled when loading hooks from strings."
        """
        callback(new Error(msg))
    else
      return callback()
  else
    patternArray = [].concat pattern

    async.eachSeries patternArray, (item, nextPattern) ->
      files = glob.sync item

      logger.info 'Found Hookfiles: ' + files

      # Running in not sandboxed mode
      if not runner.configuration.options.sandbox == true
        try
          for file in files
            proxyquire path.resolve((customConfigCwd or process.cwd()), file), {
              'hooks': runner.hooks
            }

          # Fixing #168 issue
          fixLegacyTransactionNames runner.hooks
          return nextPattern()
        catch error
          logger.warn 'Skipping hook loading...'
          logger.warn 'Error reading hook files (' + files + ')'
          logger.warn 'This probably means one or more of your hookfiles is invalid.'
          logger.warn 'Message: ' + error.message if error.message?
          logger.warn 'Stack: ' + error.stack if error.stack?
          return nextPattern()

      # Running in sandboxed mode
      else
        logger.info 'Loading hookfiles in sandboxed context: ' + files
        async.eachSeries files, (fileName, nextFile) ->
          resolvedPath = path.resolve((customConfigCwd or process.cwd()), fileName)

          # load hook file content
          fs.readFile resolvedPath, 'utf8', (readingError, data) ->
            return nextFile(readingError) if readingError

            # run code in sandbox
            sandboxHooksCode data, (sandboxError, result) ->
              return nextFile(sandboxError) if sandboxError

              runner.hooks = mergeSandboxedHooks(runner.hooks, result)

              # Fixing #168 issue
              fixLegacyTransactionNames runner.hooks

              nextFile()
        , nextPattern
    , callback

module.exports = addHooks
