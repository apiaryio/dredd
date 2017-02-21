net = require 'net'
{EventEmitter} = require 'events'
crossSpawn = require('cross-spawn')

generateUuid = require('uuid').v4

# for stubbing in tests
logger = require('./logger')
which = require('./which')


class HooksWorkerClient
  constructor: (@runner) ->
    options = @runner.hooks.configuration.options
    @language = options.language
    @timeout = options['hooks-worker-timeout'] || 5000
    @connectTimeout = options['hooks-worker-connect-timeout'] || 1500
    @connectRetry = options['hooks-worker-connect-retry'] || 500
    @afterConnectWait = options['hooks-worker-after-connect-wait'] || 100
    @termTimeout = options['hooks-worker-term-timeout'] || 5000
    @termRetry = options['hooks-worker-term-retry'] || 500
    @handlerHost = options['hooks-worker-handler-host'] || 'localhost'
    @handlerPort = options['hooks-worker-handler-port'] || 61321
    @handlerMessageDelimiter = '\n'
    @clientConnected = false
    @handlerEnded = false
    @handlerKilledIntentionally = false
    @connectError = false
    @emitter = new EventEmitter

  start: (callback) ->
    logger.verbose('Looking up hooks handler implementation:', @language)
    @setCommandAndCheckForExecutables (executablesError) =>
      return callback(executablesError) if executablesError

      logger.verbose('Starting hooks handler.')
      @spawnHandler (spawnHandlerError) =>
        return callback(spawnHandlerError) if spawnHandlerError

        logger.verbose('Connecting to hooks handler.')
        @connectToHandler (connectHandlerError) =>
          return callback(connectHandlerError) if connectHandlerError

          logger.verbose('Registering hooks.')
          @registerHooks (registerHooksError) ->
            return callback(registerHooksError) if registerHooksError
            callback()

  stop: (callback) ->
    @disconnectFromHandler()
    @terminateHandler callback

  terminateHandler: (callback) ->
    logger.verbose('Gracefully terminating hooks handler process.')

    term = =>
      logger.info('Sending SIGTERM to hooks handler process.')
      @handlerKilledIntentionally = true
      @handler.kill 'SIGTERM'

    kill = =>
      logger.info('Killing hooks handler process')
      @handler.kill 'SIGKILL'

    start = Date.now()
    term()

    waitForHandlerTermOrKill = =>
      if @handlerEnded == true
        clearTimeout timeout
        logger.debug('Hooks handler process successfully terminated.')
        callback()
      else
        logger.debug('Hooks handler process haven\'t terminated yet.')
        if (Date.now() - start) < @termTimeout
          term()
          timeout = setTimeout waitForHandlerTermOrKill, @termRetry
        else
          kill()
          clearTimeout(timeout)
          callback()

    timeout = setTimeout waitForHandlerTermOrKill, @termRetry

  disconnectFromHandler: ->
    @handlerClient.destroy()

  setCommandAndCheckForExecutables: (callback) ->
    # Select handler based on option, use option string as command if not match anything
    if @language == 'ruby'
      @handlerCommand = 'dredd-hooks-ruby'
      unless which.which @handlerCommand
        msg = """\
          Ruby hooks handler command not found: #{@handlerCommand}
          Install ruby hooks handler by running:
          $ gem install dredd_hooks
        """
        return callback(new Error(msg))
      else
        callback()

    else if @language == 'python'
      @handlerCommand = 'dredd-hooks-python'
      unless which.which @handlerCommand
        msg = """\
          Python hooks handler command not found: #{@handlerCommand}
          Install python hooks handler by running:
          $ pip install dredd_hooks
        """
        return callback(new Error(msg))
      else
        callback()

    else if @language == 'php'
      @handlerCommand = 'dredd-hooks-php'
      unless which.which @handlerCommand
        msg = """\
          PHP hooks handler command not found: #{@handlerCommand}
          Install php hooks handler by running:
          $ composer require ddelnano/dredd-hooks-php --dev
        """
        return callback(new Error(msg))
      else
        callback()

    else if @language == 'perl'
      @handlerCommand = 'dredd-hooks-perl'
      unless which.which @handlerCommand
        msg = """\
          Perl hooks handler command not found: #{@handlerCommand}
          Install perl hooks handler by running:
          $ cpanm Dredd::Hooks
        """
        return callback(new Error(msg))
      else
        callback()

    else if @language == 'nodejs'
      msg = '''\
        Hooks handler should not be used for Node.js. \
        Use Dredd's native Node.js hooks instead.
      '''
      return callback(new Error(msg))

    else if @language == 'go'
      gopath = process.env.GOPATH
      @handlerCommand = "#{gopath}/bin/goodman"
      unless which.which @handlerCommand
        msg = '''\
          Go hooks handler command not found in $GOPATH/bin
          Install go hooks handler by running:
          $ go get github.com/snikch/goodman/cmd/goodman
        '''
        return callback(new Error(msg))
      else
        callback()
    else
      @handlerCommand = @language
      unless which.which @handlerCommand
        msg = "Hooks handler command not found: #{@handlerCommand}"
        return callback(new Error(msg))
      else
        callback()

  spawnHandler: (callback) ->
    pathGlobs = [].concat ["--port", "#{@handlerPort}", "--host", "#{@handlerHost}"], @runner.hooks?.configuration?.options?.hookfiles

    logger.info("Spawning `#{@language}` hooks handler process with command `#{@handlerCommand} #{pathGlobs.join ","}`.")
    @handler = crossSpawn.spawn @handlerCommand, pathGlobs

    @handler.stdout.on 'data', (data) ->
      logger.info("Hooks handler stdout:", data.toString())

    @handler.stderr.on 'data', (data) ->
      logger.info("Hooks handler stderr:", data.toString())

    @handler.on 'exit', (status) =>
      if status?
        if status isnt 0
          msg = "Hooks handler process '#{@handlerCommand}' exited with status: #{status}"
          logger.error(msg)
          @runner.hookHandlerError = new Error(msg)
      else
        # No exit status code means the hook handler was killed
        unless @handlerKilledIntentionally
          msg = "Hooks handler process '#{@handlerCommand}' was killed."
          logger.error(msg)
          @runner.hookHandlerError = new Error(msg)
      @handlerEnded = true

    @handler.on 'error', (error) =>
      @runner.hookHandlerError = error
      @handlerEnded = true

    callback()

  connectToHandler: (callback) ->
    start = Date.now()
    waitForConnect = =>
      if (Date.now() - start) < @connectTimeout
        clearTimeout(timeout)

        if @connectError != false
          logger.warn('Error connecting to the hooks handler process. Is the handler running? Retrying.')
          @connectError = false

        if @clientConnected != true
          connectAndSetupClient()
          timeout = setTimeout waitForConnect, @connectRetry

      else
        clearTimeout(timeout)
        unless @clientConnected
          @handlerClient.destroy() if @handlerClient?
          msg = "Connection timeout #{@connectTimeout / 1000}s to hooks handler " +
          "on #{@handlerHost}:#{@handlerPort} exceeded. Try increasing the limit."
          error = new Error(msg)
          callback(error)

    connectAndSetupClient = =>
      logger.verbose('Starting TCP connection with hooks handler process.')

      if @runner.hookHandlerError?
        return callback(@runner.hookHandlerError)

      @handlerClient = net.connect port: @handlerPort, host: @handlerHost

      @handlerClient.on 'connect', =>
        logger.info("Successfully connected to hooks handler. Waiting #{@afterConnectWait / 1000}s to start testing.")
        @clientConnected = true
        clearTimeout(timeout)
        setTimeout callback, @afterConnectWait

      @handlerClient.on 'close', ->
        logger.debug('TCP communication with hooks handler closed.')

      @handlerClient.on 'error', (connectError) =>
        logger.debug('TCP communication with hooks handler errored.', connectError)
        @connectError = connectError

      handlerBuffer = ''

      @handlerClient.on 'data', (data) =>
        logger.debug('Dredd received some data from hooks handler.')

        handlerBuffer += data.toString()
        if data.toString().indexOf(@handlerMessageDelimiter) > -1
          splittedData = handlerBuffer.split(@handlerMessageDelimiter)

          # add last chunk to the buffer
          handlerBuffer = splittedData.pop()

          messages = []
          for message in splittedData
            messages.push JSON.parse message

          for message in messages
            if message.uuid?
              logger.verbose('Dredd received a valid message from hooks handler:', message.uuid)
              @emitter.emit message.uuid, message
            else
              logger.verbose('UUID not present in hooks handler message, ignoring:', JSON.stringify(message, null, 2))

    timeout = setTimeout waitForConnect, @connectRetry

  registerHooks: (callback) ->
    eachHookNames = [
      'beforeEach'
      'beforeEachValidation'
      'afterEach'
      'beforeAll'
      'afterAll'
    ]

    for eventName in eachHookNames then do (eventName) =>
      @runner.hooks[eventName] (data, hookCallback) =>
        uuid = generateUuid()

        # send transaction to the handler
        message =
          event: eventName
          uuid: uuid
          data: data

        logger.verbose('Sending HTTP transaction data to hooks handler:', uuid)
        @handlerClient.write JSON.stringify message
        @handlerClient.write @handlerMessageDelimiter

        # register event for the sent transaction
        messageHandler = (receivedMessage) ->
          logger.verbose('Handling hook:', uuid)
          clearTimeout timeout

          # We are directly modifying the `data` argument here. Neither direct
          # assignment (`data = receivedMessage.data`) nor `clone()` will work...

          # *All hooks receive array of transactions
          if eventName.indexOf('All') > -1
            for value, index in receivedMessage.data
              data[index] = value
          # *Each hook receives single transaction
          else
            for own key, value of receivedMessage.data
              data[key] = value

          hookCallback()

        handleTimeout = =>
          logger.warn('Hook handling timed out.')

          if eventName.indexOf('All') is -1
            data.fail = 'Hook timed out.'

          @emitter.removeListener uuid, messageHandler

          hookCallback()

        # set timeout for the hook
        timeout = setTimeout handleTimeout, @timeout

        @emitter.on uuid, messageHandler

    @runner.hooks.afterAll((transactions, hookCallback) =>
      # This is needed for transaction modification integration tests:
      # https://github.com/apiaryio/dredd-hooks-template/blob/master/features/execution_order.feature
      if process.env.TEST_DREDD_HOOKS_HANDLER_ORDER is 'true'
        console.error('FOR TESTING ONLY')
        modifications = transactions[0]?.hooks_modifications or []
        unless modifications.length
          throw new Error('Hooks must modify transaction.hooks_modifications')
        for modification, index in modifications
          console.error("#{index} #{modification}")
        console.error('FOR TESTING ONLY')
      @stop(hookCallback)
    )

    callback()



module.exports = HooksWorkerClient
