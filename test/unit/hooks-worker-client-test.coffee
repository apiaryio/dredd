proxyquire = require 'proxyquire'
{EventEmitter} = require 'events'
sinon = require 'sinon'
net = require 'net'
{assert} = require 'chai'
clone = require 'clone'

crossSpawnStub = require('cross-spawn')
whichStub = require('../../src/which')
loggerStub = require('../../src/logger')

Hooks = require '../../src/hooks'
commandLineOptions = require '../../src/options'

measureExecutionDurationMs = (fn) ->
  time = process.hrtime()
  fn()
  timeDiff = process.hrtime(time) # timeDiff = [seconds, nanoseconds]
  return (timeDiff[0] * 1000 + timeDiff[1] * 1e-6)

COFFEE_BIN = 'node_modules/.bin/coffee'
MIN_COMMAND_EXECUTION_DURATION_MS = 2 * measureExecutionDurationMs( ->
  crossSpawnStub.sync(COFFEE_BIN, ['test/fixtures/scripts/exit-0.coffee'])
)
PORT = 61321

runner = null
logs = null
logLevels = ['error', 'log', 'info', 'warn']

HooksWorkerClient = proxyquire '../../src/hooks-worker-client',
  'cross-spawn': crossSpawnStub
  './which': whichStub
  './logger': loggerStub

TransactionRunner = require '../../src/transaction-runner'

hooksWorkerClient = null

loadWorkerClient = (callback) ->
  hooksWorkerClient = new HooksWorkerClient(runner)
  hooksWorkerClient.start (error) ->
    callback(error)

describe 'Hooks worker client', ->
  beforeEach ->
    logs = []

    runner = new TransactionRunner({})
    runner.hooks = new Hooks(logs: [], logger: console)
    runner.hooks.configuration = {options: {}}

    for level in logLevels
      sinon.stub loggerStub, level, (msg1, msg2) ->
        text = msg1
        text += " " + msg2 if msg2

        # Uncomment to enable logging for debug
        # console.log text
        logs.push text

  afterEach ->
    for level in logLevels
      loggerStub[level].restore()

  describe "when methods dealing with connection to the handler are stubbed", ->
    beforeEach ->
      sinon.stub HooksWorkerClient.prototype, 'disconnectFromHandler', ->
      sinon.stub HooksWorkerClient.prototype, 'connectToHandler', (cb) ->
        cb()

    afterEach ->
      HooksWorkerClient.prototype.disconnectFromHandler.restore()
      HooksWorkerClient.prototype.connectToHandler.restore()

    it 'should pipe spawned process stdout to the Dredd process stdout', (done) ->
      runner.hooks.configuration.options.language = "#{COFFEE_BIN} test/fixtures/scripts/stdout.coffee"
      loadWorkerClient (workerError) ->
        return done workerError if workerError

        # The handler sometimes doesn't write to stdout or stderr until it
        # finishes, so we need to manually stop it. However, it could happen
        # we'll stop it before it actually manages to do what we test here, so
        # we add some timeout here.
        setTimeout ->
          hooksWorkerClient.stop (stopError) ->
            return done stopError if stopError
            assert.include logs, 'Hooks handler stdout: standard output text\n'
            done()
        , MIN_COMMAND_EXECUTION_DURATION_MS

    it 'should pipe spawned process stderr to the Dredd process stderr', (done) ->
      runner.hooks.configuration.options.language = "#{COFFEE_BIN} test/fixtures/scripts/stderr.coffee"
      loadWorkerClient (workerError) ->
        return done workerError if workerError

        # The handler sometimes doesn't write to stdout or stderr until it
        # finishes, so we need to manually stop it. However, it could happen
        # we'll stop it before it actually manages to do what we test here, so
        # we add some timeout here.
        setTimeout ->
          hooksWorkerClient.stop (stopError) ->
            return done stopError if stopError
            assert.include logs, 'Hooks handler stderr: error output text\n'
            done()
        , MIN_COMMAND_EXECUTION_DURATION_MS

    it 'should not set the error on worker if process gets intentionally killed by Dredd ' +
    'because it can be killed after all hooks execution if SIGTERM isn\'t handled', (done) ->
      runner.hooks.configuration.options.language = "#{COFFEE_BIN} test/fixtures/scripts/endless-ignore-term.coffee"
      loadWorkerClient (workerError) ->
        return done workerError if workerError

        # The handler sometimes doesn't write to stdout or stderr until it
        # finishes, so we need to manually stop it. However, it could happen
        # we'll stop it before it actually manages to do what we test here, so
        # we add some timeout here.
        setTimeout ->
          hooksWorkerClient.stop (stopError) ->
            return done stopError if stopError
            assert.isNull runner.hookHandlerError
            done()
        , MIN_COMMAND_EXECUTION_DURATION_MS

    it 'should include the status in the error if spawned process ends with non-zero exit status', (done) ->
      runner.hooks.configuration.options.language = "#{COFFEE_BIN} test/fixtures/scripts/exit-3.coffee"
      loadWorkerClient (workerError) ->
        return done workerError if workerError

        # The handler sometimes doesn't write to stdout or stderr until it
        # finishes, so we need to manually stop it. However, it could happen
        # we'll stop it before it actually manages to do what we test here, so
        # we add some timeout here.
        setTimeout ->
          hooksWorkerClient.stop (stopError) ->
            return done stopError if stopError
            assert.isOk runner.hookHandlerError
            assert.include runner.hookHandlerError.message, '3'
            done()
        , MIN_COMMAND_EXECUTION_DURATION_MS

    describe 'when --language=nodejs option is given', ->
      beforeEach ->
        runner.hooks['configuration'] =
          options:
            language: 'nodejs'

      it 'should write a hint that native hooks should be used', (done) ->
        loadWorkerClient (err) ->
          assert.isOk err
          assert.include err.message, 'native Node.js hooks instead'
          done()

    describe 'when --language=ruby option is given and the worker is installed', ->
      beforeEach ->
        sinon.stub crossSpawnStub, 'spawn', ->
          emitter = new EventEmitter
          emitter.stdout = new EventEmitter
          emitter.stderr = new EventEmitter
          emitter

        runner.hooks['configuration'] =
          options:
            language: 'ruby'
            hookfiles: "somefile.rb"

        sinon.stub whichStub, 'which', (command) -> true

        sinon.stub HooksWorkerClient.prototype, 'terminateHandler', (callback) ->
          callback()

      afterEach ->
        crossSpawnStub.spawn.restore()

        runner.hooks['configuration'] = undefined

        whichStub.which.restore()
        HooksWorkerClient.prototype.terminateHandler.restore()

      it 'should spawn the server process with command "dredd-hooks-ruby"', (done) ->
        loadWorkerClient (err) ->
          assert.isUndefined err

          hooksWorkerClient.stop (err) ->
            assert.isUndefined err
            assert.isTrue crossSpawnStub.spawn.called
            assert.equal crossSpawnStub.spawn.getCall(0).args[0], 'dredd-hooks-ruby'
            done()

      it 'should pass --hookfiles option as an array of arguments', (done) ->
        loadWorkerClient (err) ->
          assert.isUndefined err

          hooksWorkerClient.stop (err) ->
            assert.isUndefined err
            assert.equal crossSpawnStub.spawn.getCall(0).args[1][0], 'somefile.rb'
            done()

    describe 'when --language=ruby option is given and the worker is not installed', ->
      beforeEach ->
        sinon.stub whichStub, 'which', (command) -> false

        runner.hooks['configuration'] =
          options:
            language: 'ruby'
            hookfiles: "somefile.rb"

      afterEach ->
        whichStub.which.restore()


      it 'should write a hint how to install', (done) ->
        loadWorkerClient (err) ->
          assert.isOk err
          assert.include err.message, "gem install dredd_hooks"
          done()

    describe 'when --language=python option is given and the worker is installed', ->
      beforeEach ->
        sinon.stub crossSpawnStub, 'spawn', ->
          emitter = new EventEmitter
          emitter.stdout = new EventEmitter
          emitter.stderr = new EventEmitter
          emitter

        runner.hooks['configuration'] =
          options:
            language: 'python'
            hookfiles: "somefile.py"

        sinon.stub whichStub, 'which', (command) -> true

        sinon.stub HooksWorkerClient.prototype, 'terminateHandler', (callback) ->
          callback()

      afterEach ->
        crossSpawnStub.spawn.restore()

        runner.hooks['configuration'] = undefined

        whichStub.which.restore()
        HooksWorkerClient.prototype.terminateHandler.restore()

      it 'should spawn the server process with command "dredd-hooks-python"', (done) ->
        loadWorkerClient (err) ->
          assert.isUndefined err

          hooksWorkerClient.stop (err) ->
            assert.isUndefined err
            assert.isTrue crossSpawnStub.spawn.called
            assert.equal crossSpawnStub.spawn.getCall(0).args[0], 'dredd-hooks-python'
            done()

      it 'should pass --hookfiles option as an array of arguments', (done) ->
        loadWorkerClient (err) ->
          assert.isUndefined err

          hooksWorkerClient.stop (err) ->
            assert.isUndefined err
            assert.equal crossSpawnStub.spawn.getCall(0).args[1][0], 'somefile.py'
            done()

    describe 'when --language=python option is given and the worker is not installed', ->
      beforeEach ->
        sinon.stub whichStub, 'which', (command) -> false

        runner.hooks['configuration'] =
          options:
            language: 'python'
            hookfiles: "somefile.py"

      afterEach ->
        whichStub.which.restore()

      it 'should write a hint how to install', (done) ->
        loadWorkerClient (err) ->
          assert.isOk err
          assert.include err.message, "pip install dredd_hooks"
          done()

    describe 'when --language=php option is given and the worker is installed', ->
      beforeEach ->
        sinon.stub crossSpawnStub, 'spawn', ->
          emitter = new EventEmitter
          emitter.stdout = new EventEmitter
          emitter.stderr = new EventEmitter
          emitter

        runner.hooks['configuration'] =
          options:
            language: 'php'
            hookfiles: "somefile.py"

        sinon.stub whichStub, 'which', (command) -> true

        sinon.stub HooksWorkerClient.prototype, 'terminateHandler', (callback) ->
          callback()

      afterEach ->
        crossSpawnStub.spawn.restore()

        runner.hooks['configuration'] = undefined

        whichStub.which.restore()
        HooksWorkerClient.prototype.terminateHandler.restore()

      it 'should spawn the server process with command "dredd-hooks-php"', (done) ->
        loadWorkerClient (err) ->
          assert.isUndefined err

          hooksWorkerClient.stop (err) ->
            assert.isUndefined err
            assert.isTrue crossSpawnStub.spawn.called
            assert.equal crossSpawnStub.spawn.getCall(0).args[0], 'dredd-hooks-php'
            done()

      it 'should pass --hookfiles option as an array of arguments', (done) ->
        loadWorkerClient (err) ->
          assert.isUndefined err

          hooksWorkerClient.stop (err) ->
            assert.isUndefined err
            assert.equal crossSpawnStub.spawn.getCall(0).args[1][0], 'somefile.py'
            done()

    describe 'when --language=php option is given and the worker is not installed', ->
      beforeEach ->
        sinon.stub whichStub, 'which', (command) -> false

        runner.hooks['configuration'] =
          options:
            language: 'php'
            hookfiles: "somefile.py"

      afterEach ->
        whichStub.which.restore()

      it 'should write a hint how to install', (done) ->
        loadWorkerClient (err) ->
          assert.isOk err
          assert.include err.message, "composer require ddelnano/dredd-hooks-php --dev"
          done()

    describe 'when --language=go option is given and the worker is not installed', ->
      beforeEach ->
        sinon.stub whichStub, 'which', (command) -> false

        runner.hooks['configuration'] =
          options:
            language: 'go'
            hookfiles: 'gobinary'
      afterEach ->
        whichStub.which.restore()

      it 'should write a hint how to install', (done) ->
        loadWorkerClient (err) ->
          assert.isOk err
          assert.include err.message, "go get github.com/snikch/goodman/cmd/goodman"
          done()

    describe 'when --language=go option is given and the worker is installed', ->
      beforeEach ->
        sinon.stub crossSpawnStub, 'spawn', ->
          emitter = new EventEmitter
          emitter.stdout = new EventEmitter
          emitter.stderr = new EventEmitter
          emitter

        runner.hooks['configuration'] =
          options:
            language: 'go'
            hookfiles: "gobinary"

        sinon.stub whichStub, 'which', (command) -> true

        sinon.stub HooksWorkerClient.prototype, 'terminateHandler', (callback) ->
          callback()

      afterEach ->
        crossSpawnStub.spawn.restore()

        runner.hooks['configuration'] = undefined

        whichStub.which.restore()
        HooksWorkerClient.prototype.terminateHandler.restore()

      it 'should spawn the server process with command "$GOPATH/bin/goodman"', (done) ->
        process.env.GOPATH = 'gopath'
        loadWorkerClient (err) ->
          assert.isUndefined err

          hooksWorkerClient.stop (err) ->
            assert.isUndefined err
            assert.isTrue crossSpawnStub.spawn.called
            assert.equal crossSpawnStub.spawn.getCall(0).args[0], 'gopath/bin/goodman'
            done()

      it 'should pass --hookfiles option as an array of arguments', (done) ->
        loadWorkerClient (err) ->
          assert.isUndefined err

          hooksWorkerClient.stop (err) ->
            assert.isUndefined err
            assert.equal crossSpawnStub.spawn.getCall(0).args[1][0], 'gobinary'
            done()

    describe 'when --language=perl option is given and the worker is installed', ->
      beforeEach ->
        sinon.stub crossSpawnStub, 'spawn', ->
          emitter = new EventEmitter
          emitter.stdout = new EventEmitter
          emitter.stderr = new EventEmitter
          emitter

        runner.hooks['configuration'] =
          options:
            language: 'perl'
            hookfiles: "somefile.py"

        sinon.stub whichStub, 'which', (command) -> true

        sinon.stub HooksWorkerClient.prototype, 'terminateHandler', (callback) ->
          callback()

      afterEach ->
        crossSpawnStub.spawn.restore()

        runner.hooks['configuration'] = undefined

        whichStub.which.restore()
        HooksWorkerClient.prototype.terminateHandler.restore()

      it 'should spawn the server process with command "dredd-hooks-perl"', (done) ->
        loadWorkerClient (err) ->
          assert.isUndefined err

          hooksWorkerClient.stop (err) ->
            assert.isUndefined err
            assert.isTrue crossSpawnStub.spawn.called
            assert.equal crossSpawnStub.spawn.getCall(0).args[0], 'dredd-hooks-perl'
            done()

      it 'should pass --hookfiles option as an array of arguments', (done) ->
        loadWorkerClient (err) ->
          assert.isUndefined err

          hooksWorkerClient.stop (err) ->
            assert.isUndefined err
            assert.equal crossSpawnStub.spawn.getCall(0).args[1][0], 'somefile.py'
            done()

    describe 'when --language=perl option is given and the worker is not installed', ->
      beforeEach ->
        sinon.stub whichStub, 'which', (command) -> false

        runner.hooks['configuration'] =
          options:
            language: 'perl'
            hookfiles: "somefile.py"

      afterEach ->
        whichStub.which.restore()

      it 'should write a hint how to install', (done) ->
        loadWorkerClient (err) ->
          assert.isOk err
          assert.include err.message, "cpanm Dredd::Hooks"
          done()

    describe 'when --language=./any/other-command is given', ->
      beforeEach ->
        sinon.stub crossSpawnStub, 'spawn', ->
          emitter = new EventEmitter
          emitter.stdout = new EventEmitter
          emitter.stderr = new EventEmitter
          emitter

        runner.hooks['configuration'] =
          options:
            language: './my-fancy-command'
            hookfiles: "someotherfile"

        sinon.stub HooksWorkerClient.prototype, 'terminateHandler', (callback) ->
          callback()

        sinon.stub whichStub, 'which', -> true

      afterEach ->
        crossSpawnStub.spawn.restore()

        runner.hooks['configuration'] = undefined

        HooksWorkerClient.prototype.terminateHandler.restore()
        whichStub.which.restore()

      it 'should spawn the server process with command "./my-fancy-command"', (done) ->
        loadWorkerClient (err) ->
          assert.isUndefined err

          hooksWorkerClient.stop (err) ->
            assert.isUndefined err
            assert.isTrue crossSpawnStub.spawn.called
            assert.equal crossSpawnStub.spawn.getCall(0).args[0], './my-fancy-command'
            done()

      it 'should pass --hookfiles option as an array of arguments', (done) ->
        loadWorkerClient (err) ->
          assert.isUndefined err

          hooksWorkerClient.stop (err) ->
            assert.isUndefined err
            assert.equal crossSpawnStub.spawn.getCall(0).args[1][0], 'someotherfile'
            done()

    describe "after loading", ->
      beforeEach (done) ->

        runner.hooks['configuration'] =
          options:
            language: 'ruby'
            hookfiles: "somefile.rb"

        sinon.stub HooksWorkerClient.prototype, 'spawnHandler' , (callback) ->
          callback()

        sinon.stub whichStub, 'which', (command) -> true

        sinon.stub HooksWorkerClient.prototype, 'terminateHandler', (callback) ->
          callback()


        loadWorkerClient (err) ->
          assert.isUndefined err

          hooksWorkerClient.stop (err) ->
            assert.isUndefined err
            done()


      afterEach ->
        runner.hooks['configuration'] = undefined

        whichStub.which.restore()
        HooksWorkerClient.prototype.terminateHandler.restore()
        HooksWorkerClient.prototype.spawnHandler.restore()

      eventTypes = [
        'beforeEach'
        'beforeEachValidation'
        'afterEach'
        'beforeAll'
        'afterAll'
      ]

      for eventType in eventTypes then do (eventType) ->
        it "should register hook function for hook type #{eventType}", ->
          hookFuncs = runner.hooks["#{eventType}Hooks"]
          assert.isAbove hookFuncs.length, 0

  describe 'when hook handler server is running and not modifying transactions', ->
    server = null
    receivedData = ""
    transaction = null
    connected = null
    currentSocket = null
    sentData = ""

    beforeEach ->
      receivedData = ""

      transaction =
        key: "value"

      server = net.createServer()
      server.on 'connection', (socket) ->
        currentSocket = socket
        connected = true
        socket.on 'data', (data) ->
          receivedData += data.toString()

          receivedObject = JSON.parse receivedData.replace("\n", "")
          objectToSend = clone receivedObject
          message = JSON.stringify(objectToSend) + "\n"

          currentSocket.write message

      server.listen PORT

    afterEach ->
      server.close()


    it 'should connect to the server', (done) ->
      runner.hooks.configuration.options.language = "#{COFFEE_BIN} test/fixtures/scripts/exit-0.coffee"

      loadWorkerClient (err) ->
        assert.isUndefined err

        hooksWorkerClient.stop (err) ->
          assert.isTrue connected
          assert.isUndefined err
          done()

    eventTypes = [
      'beforeEach'
      'beforeEachValidation'
      'afterEach'
      'beforeAll'
      'afterAll'
    ]

    for eventType in eventTypes then do (eventType) ->
      describe "when '#{eventType}' hook function is triggered", ->
        if eventType.indexOf("All") > -1
          beforeEach (done) ->
            receivedData = ""
            runner.hooks.configuration.options.language = "#{COFFEE_BIN} test/fixtures/scripts/exit-0.coffee"
            sentData = clone [transaction]
            loadWorkerClient (err) ->
              assert.isUndefined err
              runner.hooks["#{eventType}Hooks"][0] sentData, ->
                done()

        else
          beforeEach (done) ->
            receivedData = ""
            runner.hooks.configuration.options.language = "#{COFFEE_BIN} test/fixtures/scripts/exit-0.coffee"
            sentData = clone transaction
            loadWorkerClient (err) ->
              assert.isUndefined err
              runner.hooks["#{eventType}Hooks"][0] sentData, ->
                done()

        afterEach (done) ->
          hooksWorkerClient.stop done

        it 'should send JSON to the socket ending with delimiter character', (done) ->
          assert.include receivedData, "\n"
          assert.include receivedData, "{"
          done()


        describe 'sent object', ->
          receivedObject = null

          beforeEach ->
            receivedObject = JSON.parse receivedData.replace("\n", "")

          keys = [
            'data'
            'event'
            'uuid'
          ]

          for key in keys then do (key) ->
            it "should contain key #{key}", ->
              assert.property receivedObject, key

          it "key event should have value #{eventType}", ->
            assert.equal receivedObject['event'], eventType

          if eventType.indexOf("All") > -1
            it "key data should contain array of transaction objects", ->
              assert.isArray receivedObject['data']
              assert.propertyVal receivedObject['data'][0], 'key', 'value'
          else
            it "key data should contain the transaction object", ->
              assert.isObject receivedObject['data']
              assert.propertyVal receivedObject['data'], 'key', 'value'

  describe 'when hook handler server is running and modifying transactions', ->
    transaction =
      name: 'API > Hello > World'
      request: {method: 'POST', uri: '/message', headers: {}, body: 'Hello World!'}

    [
      'beforeAll'
      'beforeEach'
      'beforeEachValidation'
      'afterEach'
      'afterAll'
    ].forEach((eventName) ->
      if eventName.match(/All$/)
        # the hooks which are called '*All' recieve an array of transactions
        # as a parameter
        transactionData = clone([transaction])
        getFirstTransaction = (transactionData) -> transactionData[0]
      else
        # all the other hooks recieve a single transaction as a parameter
        transactionData = clone(transaction)
        getFirstTransaction = (transactionData) -> transactionData

      describe("when '#{eventName}' function is triggered and the hook handler replies", ->
        hookHandler = undefined

        beforeEach((done) ->
          # Dummy placeholder for a real hook handler
          runner.hooks.configuration.options.language = "#{COFFEE_BIN} test/fixtures/scripts/exit-0.coffee"

          # Mock hook handler implementation, which ocuppies expected port instead
          # of a real hook handler.
          hookHandler = net.createServer()
          hookHandler.on('connection', (socket) ->
            # -- 3 --, recieving transaction(s) from hooks worker client
            bufferedData = ''
            socket.on('data', (data) ->
              # We're buffering data here into a string, until...
              bufferedData += data.toString()

              # -- 4 --, ...until there's a message separator (new line), which
              # means we've got one complete message in our buffer
              if '\n' in bufferedData
                messageIn = JSON.parse(bufferedData)

                # once the hooks worker client finishes processing of data it
                # got back from the hook handler, it triggers this event
                hooksWorkerClient.emitter.on(messageIn.uuid, ->
                  # -- 7 --
                  done()
                )

                # -- 5 --, modifying the transaction
                transaction = getFirstTransaction(messageIn.data)
                transaction.request.uri += '?param=value'

                # -- 6 --, sending modified data back to hooks worker client
                messageOut = JSON.stringify(messageIn) + '\n'
                socket.write(messageOut)
            )
          )

          # -- 1 --, starts the mock hook handler
          hookHandler.listen(PORT)

          # -- 2 --, runs hooks worker client, starts to send transaction(s),
          # thus triggers the 'connection' event above
          loadWorkerClient((err) ->
            return done(err) if err
            runner.hooks["#{eventName}Hooks"][0](transactionData, -> )
          )
        )
        afterEach((done) ->
          hookHandler.close()
          hooksWorkerClient.stop(done)
        )

        it('modifications get applied to the original transaction object', ->
          transaction = getFirstTransaction(transactionData)
          assert.equal(transaction.request.uri, '/message?param=value')
        )
      )
    )

  describe "'hooks-worker-*' configuration options", ->
    scenarios = [
        property: 'timeout'
        option: 'hooks-worker-timeout'
      ,
        property: 'connectTimeout'
        option: 'hooks-worker-connect-timeout'
      ,
        property: 'connectRetry'
        option: 'hooks-worker-connect-retry'
      ,
        property: 'afterConnectWait'
        option: 'hooks-worker-after-connect-wait'
      ,
        property: 'termTimeout'
        option: 'hooks-worker-term-timeout'
      ,
        property: 'termRetry'
        option: 'hooks-worker-term-retry'
      ,
        property: 'handlerHost'
        option: 'hooks-worker-handler-host'
      ,
        property: 'handlerPort'
        option: 'hooks-worker-handler-port'
    ]

    for scenario in scenarios
      do (scenario) ->
        describe "Option '#{scenario.option}'", ->
          defaultValue = commandLineOptions[scenario.option].default
          changedValue = defaultValue + 42

          it "is set to #{defaultValue} by default", ->
            hooksWorkerClient = new HooksWorkerClient(runner)
            assert.equal hooksWorkerClient[scenario.property], defaultValue

          it 'can be set to a different value', ->
            runner.hooks.configuration.options[scenario.option] = changedValue
            hooksWorkerClient = new HooksWorkerClient(runner)
            assert.equal hooksWorkerClient[scenario.property], changedValue
