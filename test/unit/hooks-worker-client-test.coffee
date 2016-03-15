proxyquire = require 'proxyquire'
{EventEmitter} = require 'events'
sinon = require 'sinon'
net = require 'net'
{assert} = require 'chai'
clone = require 'clone'

childProcessStub = require 'child_process'
loggerStub = require '../../src/logger'
whichStub =  require '../../src/which'

Hooks = require '../../src/hooks'
commandLineOptions = require '../../src/options'

PORT = 61321

runner = null
logs = null
logLevels = ['error', 'log', 'info', 'warn']

HooksWorkerClient = proxyquire '../../src/hooks-worker-client', {
  'child_process': childProcessStub
  './logger': loggerStub
  './which': whichStub
}

TransactionRunner = require '../../src/transaction-runner'

hooksWorkerClient = null

loadWorkerClient = (callback) ->
  hooksWorkerClient = new HooksWorkerClient(runner)
  hooksWorkerClient.start (error) ->
    callback(error)

describe 'Hooks worker client', ->
  beforeEach ->
    logs = []

    runner = new TransactionRunner {}
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
      sinon.stub HooksWorkerClient.prototype, 'disconnectFromHandler'
      sinon.stub HooksWorkerClient.prototype, 'connectToHandler', (cb) ->
        cb()

    afterEach ->
      HooksWorkerClient.prototype.disconnectFromHandler.restore()
      HooksWorkerClient.prototype.connectToHandler.restore()

    it 'should pipe spawned process stdout to the Dredd process stdout', (done) ->
      runner.hooks.configuration.options.language = './test/fixtures/scripts/stdout.sh'
      loadWorkerClient (err) ->
        assert.isUndefined err

        # Race condition workaround
        # Spawned process doesn't write to stdout before is terminated
        hooksWorkerClient.stop ->
          assert.include logs, "Hook handler stdout: standard output text\n"
          done()


    it 'should pipe spawned process stderr to the Dredd process stderr', (done) ->
      runner.hooks.configuration.options.language = './test/fixtures/scripts/stderr.sh'
      loadWorkerClient (err) ->
        assert.isUndefined err

        # Race condition workaround
        # Spawned process doesn't write to stderr before is terminated
        hooksWorkerClient.stop ->
          assert.include logs, "Hook handler stderr: error output text\n"
          done()

    it 'should not set the error on worker if process gets intentionally killed by Dredd ' +
    'because it can be killed after all hooks execution if SIGTERM isn\'t handled', (done) ->
      runner.hooks.configuration.options.language = './test/fixtures/scripts/endless-nosigterm.sh'
      loadWorkerClient (workerError) ->
        done workerError if workerError

        hooksWorkerClient.stop (error) ->
          done workerError if workerError
          assert.isNull runner.hookHandlerError
          done()

    it 'should include the status in the error if spawned process ends with non-zero exit status', (done) ->
      runner.hooks.configuration.options.language = './test/fixtures/scripts/exit_3.sh'
      loadWorkerClient (workerError) ->
        done workerError if workerError

        hooksWorkerClient.stop (error) ->
          done error if error
          assert.isDefined runner.hookHandlerError
          assert.include runner.hookHandlerError.message, '3'
          done()

    describe 'when --language ruby option is given and the worker is installed', ->
      beforeEach ->
        sinon.stub childProcessStub, 'spawn', ->
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
        childProcessStub.spawn.restore()

        runner.hooks['configuration'] = undefined

        whichStub.which.restore()
        HooksWorkerClient.prototype.terminateHandler.restore()

      it 'should spawn the server process with command "dredd-hooks-ruby"', (done) ->
        loadWorkerClient (err) ->
          assert.isUndefined err

          hooksWorkerClient.stop (err) ->
            assert.isUndefined err
            assert.isTrue childProcessStub.spawn.called
            assert.equal childProcessStub.spawn.getCall(0).args[0], 'dredd-hooks-ruby'
            done()

      it 'should pass --hookfiles option as an array of arguments', (done) ->
        loadWorkerClient (err) ->
          assert.isUndefined err

          hooksWorkerClient.stop (err) ->
            assert.isUndefined err
            assert.equal childProcessStub.spawn.getCall(0).args[1][0], 'somefile.rb'
            done()

    describe 'when --language ruby option is given and the worker is not installed', ->
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
          assert.isDefined err
          assert.include err.message, "gem install dredd_hooks"
          done()

    describe 'when --language python option is given and the worker is installed', ->
      beforeEach ->
        sinon.stub childProcessStub, 'spawn', ->
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
        childProcessStub.spawn.restore()

        runner.hooks['configuration'] = undefined

        whichStub.which.restore()
        HooksWorkerClient.prototype.terminateHandler.restore()

      it 'should spawn the server process with command "dredd-hooks-python"', (done) ->
        loadWorkerClient (err) ->
          assert.isUndefined err

          hooksWorkerClient.stop (err) ->
            assert.isUndefined err
            assert.isTrue childProcessStub.spawn.called
            assert.equal childProcessStub.spawn.getCall(0).args[0], 'dredd-hooks-python'
            done()

      it 'should pass --hookfiles option as an array of arguments', (done) ->
        loadWorkerClient (err) ->
          assert.isUndefined err

          hooksWorkerClient.stop (err) ->
            assert.isUndefined err
            assert.equal childProcessStub.spawn.getCall(0).args[1][0], 'somefile.py'
            done()

    describe 'when --language python option is given and the worker is not installed', ->
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
          assert.isDefined err
          assert.include err.message, "pip install dredd_hooks"
          done()

    describe 'when --language php option is given and the worker is installed', ->
      beforeEach ->
        sinon.stub childProcessStub, 'spawn', ->
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
        childProcessStub.spawn.restore()

        runner.hooks['configuration'] = undefined

        whichStub.which.restore()
        HooksWorkerClient.prototype.terminateHandler.restore()

      it 'should spawn the server process with command "dredd-hooks-php"', (done) ->
        loadWorkerClient (err) ->
          assert.isUndefined err

          hooksWorkerClient.stop (err) ->
            assert.isUndefined err
            assert.isTrue childProcessStub.spawn.called
            assert.equal childProcessStub.spawn.getCall(0).args[0], 'dredd-hooks-php'
            done()

      it 'should pass --hookfiles option as an array of arguments', (done) ->
        loadWorkerClient (err) ->
          assert.isUndefined err

          hooksWorkerClient.stop (err) ->
            assert.isUndefined err
            assert.equal childProcessStub.spawn.getCall(0).args[1][0], 'somefile.py'
            done()

    describe 'when --language php option is given and the worker is not installed', ->
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
          assert.isDefined err
          assert.include err.message, "composer require ddelnano/dredd-hooks-php --dev"
          done()

    describe 'when --language perl option is given and the worker is installed', ->
      beforeEach ->
        sinon.stub childProcessStub, 'spawn', ->
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
        childProcessStub.spawn.restore()

        runner.hooks['configuration'] = undefined

        whichStub.which.restore()
        HooksWorkerClient.prototype.terminateHandler.restore()

      it 'should spawn the server process with command "dredd-hooks-perl"', (done) ->
        loadWorkerClient (err) ->
          assert.isUndefined err

          hooksWorkerClient.stop (err) ->
            assert.isUndefined err
            assert.isTrue childProcessStub.spawn.called
            assert.equal childProcessStub.spawn.getCall(0).args[0], 'dredd-hooks-perl'
            done()

      it 'should pass --hookfiles option as an array of arguments', (done) ->
        loadWorkerClient (err) ->
          assert.isUndefined err

          hooksWorkerClient.stop (err) ->
            assert.isUndefined err
            assert.equal childProcessStub.spawn.getCall(0).args[1][0], 'somefile.py'
            done()

    describe 'when --language perl option is given and the worker is not installed', ->
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
          assert.isDefined err
          assert.include err.message, "cpanm Dredd::Hooks"
          done()

    describe 'when --language ./any/other-command is given', ->
      beforeEach ->
        sinon.stub childProcessStub, 'spawn', ->
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
        childProcessStub.spawn.restore()

        runner.hooks['configuration'] = undefined

        HooksWorkerClient.prototype.terminateHandler.restore()
        whichStub.which.restore()

      it 'should spawn the server process with command "./my-fancy-command"', (done) ->
        loadWorkerClient (err) ->
          assert.isUndefined err

          hooksWorkerClient.stop (err) ->
            assert.isUndefined err
            assert.isTrue childProcessStub.spawn.called
            assert.equal childProcessStub.spawn.getCall(0).args[0], './my-fancy-command'
            done()

      it 'should pass --hookfiles option as an array of arguments', (done) ->
        loadWorkerClient (err) ->
          assert.isUndefined err

          hooksWorkerClient.stop (err) ->
            assert.isUndefined err
            assert.equal childProcessStub.spawn.getCall(0).args[1][0], 'someotherfile'
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
      runner.hooks.configuration.options.language = 'true'

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
            runner.hooks.configuration.options.language = 'true'
            sentData = clone [transaction]
            loadWorkerClient (err) ->
              assert.isUndefined err
              runner.hooks["#{eventType}Hooks"][0] sentData, ->
                done()

        else
          beforeEach (done) ->
            receivedData = ""
            runner.hooks.configuration.options.language = 'true'
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

      server.listen PORT

    afterEach ->
      server.close()

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
            runner.hooks.configuration.options.language = 'true'
            sentData = clone [transaction]
            loadWorkerClient (err) ->
              assert.isUndefined err
              runner.hooks["#{eventType}Hooks"][0] sentData, ->
              done() # intentionally unindented!

        else
          beforeEach (done) ->
            receivedData = ""
            runner.hooks.configuration.options.language = 'true'
            sentData = clone transaction
            loadWorkerClient (err) ->
              assert.isUndefined err
              runner.hooks["#{eventType}Hooks"][0] sentData, ->
              done() # intentionally unindented!

        afterEach (done) ->
          hooksWorkerClient.stop done

        if eventType.indexOf("All") > -1
          describe 'when server sends a response with matching uuid', ->
            beforeEach ->
              receivedObject = null
              receivedObject = JSON.parse clone(receivedData).replace("\n", "")

              objectToSend = clone receivedObject
              # *all events are handling array of transactions
              objectToSend['data'][0]['key'] = "newValue"
              message = JSON.stringify(objectToSend) + "\n"
              currentSocket.write message

            it 'should add data from the response to the transaction', (done) ->
              setTimeout ->
                assert.equal sentData[0]['key'], 'newValue'
                done()
              , 200
        else
          describe 'when server sends a response with matching uuid', ->
            beforeEach ->
              receivedObject = null
              receivedObject = JSON.parse clone(receivedData).replace("\n", "")

              objectToSend = clone receivedObject
              objectToSend['data']['key'] = "newValue"

              message = JSON.stringify(objectToSend) + "\n"
              currentSocket.write message

            it 'should add data from the response to the transaction', (done) ->
              setTimeout ->
                assert.equal sentData['key'], 'newValue'
                done()
              , 200

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
