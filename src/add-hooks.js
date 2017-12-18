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

# Ensure platform agnostic path.basename function
basename = if process.platform is 'win32' then path.win32.basename else path.basename

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

  loadHookFile = (filePath) ->
    try
      proxyquire filePath, {
        'hooks': runner.hooks
      }

      # Fixing #168 issue
      fixLegacyTransactionNames runner.hooks

    catch error
      logger.warn("""\
        Skipping hook loading. Error reading hook file '#{filePath}'. \
        This probably means one or more of your hook files are invalid.
        Message: #{error.message}
        Stack: #{error.stack}
      """)

  loadSandboxHooksFromStrings = (callback) ->
    if typeof(runner.configuration.hooksData) != 'object' or Array.isArray(runner.configuration.hooksData) != false
      return callback(new Error("hooksData option must be an object e.g. {'filename.js':'console.log(\"Hey!\")'}"))

    # Run code in sandbox
    async.eachSeries Object.keys(runner.configuration.hooksData), (key, nextHook) ->
      data = runner.configuration.hooksData[key]

      # Run code in sandbox
      sandboxHooksCode data, (sandboxError, result) ->
        return nextHook(sandboxError) if sandboxError

        # Merge stringified hooks
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
        msg = '''\
          Not sandboxed hooks loading from strings is not implemented, \
          Sandbox mode must be enabled when loading hooks from strings.\
        '''
        callback(new Error(msg))
    else

      # No data found, doing nothing
      return callback()

  # Loading hookfiles from fs
  else
    # Expand hookfiles - sort files alphabetically and resolve their paths
    hookfiles = [].concat runner.configuration?.options?.hookfiles
    files = hookfiles.reduce((result, unresolvedPath) ->
      # glob.sync does not resolve paths, only glob patterns
      unresolvedPaths = if glob.hasMagic(unresolvedPath) then glob.sync(unresolvedPath) else [unresolvedPath]

      # Gradually append sorted and resolved paths
      result.concat unresolvedPaths
        # Create a filename / filepath map for easier sorting
        # Example:
        # [
        #   { basename: 'filename1.coffee', path: './path/to/filename1.coffee' }
        #   { basename: 'filename2.coffee', path: './path/to/filename2.coffee' }
        # ]
        .map((filepath) -> basename: basename(filepath), path: filepath)
        # Sort 'em up
        .sort((a, b) -> switch
          when a.basename < b.basename then -1
          when a.basename > b.basename then 1
          else 0
        )
        # Resolve paths to absolute form. Take into account user defined current
        # working directory, fallback to process.cwd() otherwise
        .map((item) -> path.resolve(customConfigCwd or process.cwd(), item.path))
    , [] # Start with empty result
    )

    logger.info('Found Hookfiles:', files)

    # Clone the configuration object to hooks.configuration to make it
    # accessible in the node.js hooks API
    runner.hooks.configuration = clone runner?.configuration

    # Override hookfiles option in configuration object with
    # sorted and resolved files
    runner.hooks.configuration.options.hookfiles = files

    # Loading files in non sandboxed nodejs
    if not runner.configuration.options.sandbox == true

      # If the language is empty or it is nodejs
      if runner?.configuration?.options?.language == "" or
      runner?.configuration?.options?.language == undefined or
      runner?.configuration?.options?.language == "nodejs"

        # Load regular files from fs
        for file in files
          loadHookFile file

        return callback()

      # If other language than nodejs, run hooks worker client
      # Worker client will start the worker server and pass the "hookfiles" options as CLI arguments to it
      else
        # Start hooks worker
        hooksWorkerClient = new HooksWorkerClient(runner)
        hooksWorkerClient.start callback

    # Loading files in sandboxed mode
    else

      # Load sandbox files from fs
      logger.info('Loading hook files in sandboxed context:', files)
      async.eachSeries files, (resolvedPath, nextFile) ->
        # Load hook file content
        fs.readFile resolvedPath, 'utf8', (readingError, data) ->
          return nextFile(readingError) if readingError
          # Run code in sandbox
          sandboxHooksCode data, (sandboxError, result) ->
            return nextFile(sandboxError) if sandboxError
            runner.hooks = mergeSandboxedHooks(runner.hooks, result)

            # Fixing #168 issue
            fixLegacyTransactionNames runner.hooks

            nextFile()
      , callback



module.exports = addHooks
