require 'coffee-script/register'
path = require 'path'
proxyquire = require('proxyquire').noCallThru()
glob = require 'glob'
fs = require 'fs'

Hooks = require './hooks'
logger = require './logger'
sandboxHooksCode = require './sandbox-hooks-code'

addHooks = (runner, transactions, callback) ->

  hooks = new Hooks()
  hooks.transactions ?= {}

  for transaction in transactions
    hooks.transactions[transaction.name] = transaction

  pattern = runner?.configuration?.options?.hookfiles
  if pattern

    files = glob.sync pattern

    logger.info 'Found Hookfiles: ' + files

    # Running in node sendboxed mode
    if runner?.configuration?.options?.sandbox == false
      try
        for file in files
          proxyquire path.resolve((customConfig?.cwd or process.cwd()), file), {
            'hooks': hooks
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
      for file in files
        resolvedPath = path.resolve((customConfig?.cwd or process.cwd()), file)

        # load hook file content
        fs.readFile resolvedPath, 'utf8', (readingError, data) ->
          return callback readingError if readingError

          # run code in sandbox
          sandboxHooksCode data, (sandboxError, result) ->
            return callback(sandboxError) if sandboxError

            # merge hooks

            callback()




  runner.hooks ?= hooks

  return hooks

module.exports = addHooks
