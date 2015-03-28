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

  runner.hooks = new Hooks()
  runner.hooks.transactions ?= {}

  customConfigCwd = runner?.configuration?.custom?.cwd

  for transaction in transactions
    runner.hooks.transactions[transaction.name] = transaction

  pattern = runner?.configuration?.options?.hookfiles
  if not pattern
    if runner.configuration.hooksData?
      if runner.configuration.options.sandbox == true
        if typeof(runner.configuration.hooksData) != 'object' or Array.isArray(runner.configuration.hooksData) != false
          return callback(new Error "hooksData option must be an object e.g. {'filename.js':'console.log(\"Hey!\")'}")

        # run code in sandbox
        async.eachSeries Object.keys(runner.configuration.hooksData), (key, next) ->
          data = runner.configuration.hooksData[key]

          # run code in sandbox
          sandboxHooksCode data, (sandboxError, result) ->
            return next(sandboxError) if sandboxError

            # merge stringified hooks
            runner.hooks = mergeSandboxedHooks(runner.hooks, result)
            next()

        , callback
      # else
      #   callback(new Error "Sandbox mode must me on for loading hooks from strings")
    else
      return callback()
  else
    files = glob.sync pattern

    logger.info 'Found Hookfiles: ' + files

    # Running in not sendboxed mode
    if not runner.configuration.options.sandbox == true
      try
        for file in files
          proxyquire path.resolve((customConfigCwd or process.cwd()), file), {
            'hooks': runner.hooks
          }
        return callback()
      catch error
        logger.warn 'Skipping hook loading...'
        logger.warn 'Error reading hook files (' + files + ')'
        logger.warn 'This probably means one or more of your hookfiles is invalid.'
        logger.warn 'Message: ' + error.message if error.message?
        logger.warn 'Stack: ' + error.stack if error.stack?
        return callback()

    # Running in sendboxed mode
    else
      logger.info 'Loading hookfiles in sandboxed context' + files
      for file in files
        resolvedPath = path.resolve((customConfigCwd or process.cwd()), file)

        # load hook file content
        fs.readFile resolvedPath, 'utf8', (readingError, data) ->
          return callback readingError if readingError

          # run code in sandbox
          sandboxHooksCode data, (sandboxError, result) ->
            return callback(sandboxError) if sandboxError

            runner.hooks = mergeSandboxedHooks(runner.hooks, result)

            callback()


module.exports = addHooks
