path = require 'path'

require 'coffee-script'
proxyquire = require('proxyquire').noCallThru()
glob = require 'glob'

hooks = require './hooks'
logger = require './logger'

addHooks = (runner) ->
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
      if hooks.beforeHooks[transaction.name]?
        hook = hooks.beforeHooks[transaction.name]
        runHook(hook, transaction, callback)
      else
        callback()
    runner.after 'executeTransaction', (transaction, callback) =>
      if hooks.afterHooks[transaction.name]?
        hook = hooks.afterHooks[transaction.name]
        runHook(hook, transaction, callback)
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
