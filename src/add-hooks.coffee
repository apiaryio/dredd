require 'coffee-script/register'
path = require 'path'
proxyquire = require('proxyquire').noCallThru()
glob = require 'glob'
fs = require 'fs'
async = require 'async'
clone = require 'clone'

Hooks = require './hooks'
logger = require './logger'
sandboxHooksCode = require './sandbox-hooks-code'
mergeSandboxedHooks = require './merge-sandboxed-hooks'
HooksWorkerClient = require './hooks-worker-client'


addHooks = (runner, transactions, callback) ->
  # Note: runner.configuration.options must be defined

  customConfigCwd = runner?.configuration?.custom?.cwd

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

  loadHookFile = (filename, basePath) ->
    basePath ?= customConfigCwd or process.cwd()
    filePath = path.resolve(basePath, filename)

    try
      proxyquire filePath, {
        'hooks': runner.hooks
      }

      # Fixing #168 issue
      fixLegacyTransactionNames runner.hooks

    catch error
      logger.warn 'Skipping hook loading...'
      logger.warn 'Error reading hook file "' + filePath + '"'
      logger.warn 'This probably means one or more of your hookfiles is invalid.'
      logger.warn 'Message: ' + error.message if error.message?
      logger.warn 'Stack: ' + error.stack if error.stack?

  loadSandboxHooksFromStrings = (callback) ->
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

  runner.logs ?= []
  runner.hooks = new Hooks(logs: runner.logs, logger: logger)
  runner.hooks.transactions ?= {}

  for transaction in transactions
    runner.hooks.transactions[transaction.name] = transaction

  # Loading hooks from string, sandbox mode must be enabled
  if not runner?.configuration?.options?.hookfiles
    if runner.configuration.hooksData?

      if runner.configuration.options.sandbox == true
        loadSandboxHooksFromStrings(callback)
      else
        # not sandboxed code can't be loaded from the string
        msg = """
        Not sandboxed hooks loading from strings is not implemented,
        Sandbox mode must be enabled when loading hooks from strings."
        """
        callback(new Error(msg))
    else

      # no data found, doing nothing
      return callback()

  # Loading hookfiles from fs
  else

    # Clone the configuration object to hooks.configuration to make it
    # accessible in the node.js hooks API
    runner.hooks.configuration = clone runner?.configuration

    # Expand globs
    files = []
    globs = [].concat runner?.configuration?.options?.hookfiles
    for globItem in globs
      files = files.concat glob.sync(globItem)

    logger.info 'Found Hookfiles: ' + files

    # Loading files in non sandboxed nodejs
    if not runner.configuration.options.sandbox == true

      # If the language is empty or it is nodejs
      if runner?.configuration?.options?.language == "" or
      runner?.configuration?.options?.language == undefined or
      runner?.configuration?.options?.language == "nodejs"

        # load regular files from fs
        for file in files
          loadHookFile file

        return callback()

      # If other language than nodejs, run hooks worker client
      # Worker client will start the worker server and pass the "hookfiles" options as CLI arguments to it
      else
        # start hooks worker
        hooksWorkerClient = new HooksWorkerClient(runner)
        hooksWorkerClient.start callback

    # Loading files in sandboxed mode
    else

      # load sandbox files from fs
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
      , callback



module.exports = addHooks
