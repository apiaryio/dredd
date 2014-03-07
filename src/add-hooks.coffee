path = require 'path'

require 'coffee-script'
proxyquire = require('proxyquire').noCallThru()
glob = require 'glob'
async = require 'async'

hooks = require './hooks'
logger = require './logger'

addHooks = (runner, transactions) ->

    for transaction in transactions
      hooks.transactions[transaction.name] = transaction

    pattern = runner?.configuration?.options?.hookfiles
    return if not pattern

    files = glob.sync pattern

    logger.info 'Found Hookfiles: ' + files

    try
      for file in files
        proxyquire path.resolve(process.cwd(), file), {
          'hooks': hooks
        }
    catch error
      logger.warn 'Skipping hook loading...'
      logger.error 'Error reading hook files (' + files + ')'
      logger.error 'This probably means one or more of your hookfiles is invalid.'
      logger.error 'Message: ' + error.message if error.message?
      logger.error 'Stack: ' + error.stack if error.stack?
      return

    runner.before 'executeTransaction', (transaction, callback)  =>
      runHooksForTransaction hooks.beforeHooks[transaction.name], transaction, callback

    runner.after 'executeTransaction', (transaction, callback) =>
      runHooksForTransaction hooks.afterHooks[transaction.name], transaction, callback

  runHooksForTransaction = (hooksForTransaction, transaction, callback) =>
    if hooksForTransaction?
        logger.debug 'Running hooks...'

        runHookWithTransaction = (hook, callback) ->
          runHook hook, transaction, callback

        async.eachSeries hooksForTransaction, runHookWithTransaction, () ->
          callback()

      else
        callback()

  runHook = (hook, transaction, callback) ->
    if hook.length is 1
      # syncronous, no callback
      hook transaction
      callback()
    else if hook.length is 2
      # async
      hook transaction, () =>
        callback()

module.exports = addHooks
