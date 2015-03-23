path = require 'path'

require 'coffee-script/register'
proxyquire = require('proxyquire').noCallThru()
glob = require 'glob'
Hooks = require './hooks'
logger = require './logger'

addHooks = (runner, transactions, emitter, customConfig) ->

  hooks = new Hooks()
  hooks.transactions ?= {}

  for transaction in transactions
    hooks.transactions[transaction.name] = transaction

  pattern = runner?.configuration?.options?.hookfiles
  if pattern

    files = glob.sync pattern

    logger.info 'Found Hookfiles: ' + files

    try
      for file in files
        proxyquire path.resolve((customConfig?.cwd or process.cwd()), file), {
          'hooks': hooks
        }
    catch error
      logger.warn 'Skipping hook loading...'
      logger.warn 'Error reading hook files (' + files + ')'
      logger.warn 'This probably means one or more of your hookfiles is invalid.'
      logger.warn 'Message: ' + error.message if error.message?
      logger.warn 'Stack: ' + error.stack if error.stack?
      return

  return hooks

module.exports = addHooks
