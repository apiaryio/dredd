proxyquire = require('proxyquire').noCallThru()
EventEmitter = require('events').EventEmitter
sinon = require 'sinon'
net = require 'net'
{assert} = require 'chai'
clone = require 'clone'

childProcessStub = require 'child_process'
consoleStub = require 'console'
whichStub =  require '../../src/which'

Hooks = require '../../src/hooks'

PORT = 61321

hooks = null

loadWorkerClient = () ->
  proxyquire '../../src/hooks-worker-client', {
    'child_process': childProcessStub
    'hooks': hooks
    'console': consoleStub
    './which': whichStub
  }

describe 'Hooks worker client', () ->
  beforeEach () ->
    hooks = new Hooks(logs: [], logger: console)

    sinon.stub hooks, 'processExit'

    hooks.configuration =
      options: {}

  describe "when it's loaded", () ->

    it 'should pipe spawned process stderr to the Dredd process stderr', (done) ->
      logs = []
      sinon.stub consoleStub, 'log', (msg1, msg2) ->
        logs.push msg1 + " " + msg2
        process.stdout.write msg1 + " " + msg2 + "\n"
      hooks.configuration.options.language = './test/fixtures/scripts/stderr.sh'
      loadWorkerClient()

      setTimeout () ->
        consoleStub.log.restore()
        assert.include logs, "Hook handler stderr: error output text\n"
        done()
      , 2200

    it 'should pipe spawned process stdout to the Dredd process stdout', (done) ->
      logs = []
      sinon.stub consoleStub, 'log', (msg1, msg2) ->
        logs.push msg1 + " " + msg2
        process.stdout.write msg1 + " " + msg2 + "\n"
      hooks.configuration.options.language = './test/fixtures/scripts/stdout.sh'
      loadWorkerClient()
      setTimeout () ->
        consoleStub.log.restore()
        assert.include logs, "Hook handler stdout: standard output text\n"
        done()
      , 2200

    it 'should exit Dredd with status > 1 when spawned process ends with exit status 2', (done) ->
      hooks.processExit.reset()
      hooks.configuration.options.language = './test/fixtures/scripts/exit_3.sh'
      loadWorkerClient()
      setTimeout () ->
        assert.equal hooks.processExit.getCall(0).args[0], 2
        done()
      , 2200

    describe 'when --language ruby option is given', () ->
      beforeEach ->
        sinon.stub childProcessStub, 'spawn', () ->
          emitter = new EventEmitter
          emitter.stdout = new EventEmitter
          emitter.stderr = new EventEmitter
          emitter

        hooks['configuration'] =
          options:
            language: 'ruby'
            hookfiles: "somefile.rb"

      afterEach ->
        childProcessStub.spawn.restore()
        hooks['configuration'] = undefined

      it 'should spawn the server process with command "dredd-hooks-ruby"', () ->
        loadWorkerClient()
        assert.isTrue childProcessStub.spawn.called
        assert.equal childProcessStub.spawn.getCall(0).args[0], 'dredd-hooks-ruby'

      it 'should pass --hookfiles option as a array of arguments', () ->
        loadWorkerClient()
        assert.equal childProcessStub.spawn.getCall(0).args[1][0], 'somefile.rb'

      describe 'when the worker is not installed', () ->
        it 'should exit with 1', (done) ->
          hooks.processExit.reset()
          sinon.stub whichStub, 'which', (command) -> false
          loadWorkerClient()
          setTimeout () ->
            whichStub.which.restore()
            assert.isTrue hooks.processExit.calledWith(1)
            done()
          , 2200

        it 'should write a hint how to install', (done) ->
          sinon.stub consoleStub, 'log'
          sinon.stub whichStub, 'which', (command) -> false
          loadWorkerClient()
          setTimeout () ->
            logs = []
            for args in consoleStub.log.args
              logs.push args.join(" ")

            consoleStub.log.restore()
            whichStub.which.restore()

            assert.include logs.join(", "), "gem install dredd_hooks"
            done()
          , 2200

    describe 'when --language python option is given', () ->
      beforeEach ->
        sinon.stub childProcessStub, 'spawn', () ->
          emitter = new EventEmitter
          emitter.stdout = new EventEmitter
          emitter.stderr = new EventEmitter
          emitter

        hooks['configuration'] =
          options:
            language: 'python'
            hookfiles: "somefile.py"

      afterEach ->
        childProcessStub.spawn.restore()
        hooks['configuration'] = undefined

      it 'should spawn the server process with command "dredd-hooks-python"', () ->
        loadWorkerClient()
        assert.isTrue childProcessStub.spawn.called
        assert.equal childProcessStub.spawn.getCall(0).args[0], 'dredd-hooks-python'

      it 'should pass --hookfiles option as a array of arguments', () ->
        loadWorkerClient()
        assert.equal childProcessStub.spawn.getCall(0).args[1][0], 'somefile.py'

      describe 'when the worker is not installed', () ->
        it 'should exit with 1', (done) ->
          hooks.processExit.reset()
          sinon.stub whichStub, 'which', (command) -> false
          loadWorkerClient()
          setTimeout () ->
            whichStub.which.restore()
            assert.isTrue hooks.processExit.calledWith(1)
            done()
          , 2200

        it 'should write a hint how to install', (done) ->
          sinon.stub consoleStub, 'log'
          sinon.stub whichStub, 'which', (command) -> false
          loadWorkerClient()
          setTimeout () ->
            logs = []
            for args in consoleStub.log.args
              logs.push args.join(" ")

            consoleStub.log.restore()
            whichStub.which.restore()

            assert.include logs.join(", "), "pip install dredd_hooks"
            done()
          , 2200

    describe 'when --language php option is given', () ->
      beforeEach ->
        sinon.stub childProcessStub, 'spawn', () ->
          emitter = new EventEmitter
          emitter.stdout = new EventEmitter
          emitter.stderr = new EventEmitter
          emitter

        hooks['configuration'] =
          options:
            language: 'php'
            hookfiles: "somefile.php"

      afterEach ->
        childProcessStub.spawn.restore()
        hooks['configuration'] = undefined

      it 'should spawn the server process with command "dredd-hooks-php"', () ->
        loadWorkerClient()
        assert.isTrue childProcessStub.spawn.called
        assert.equal childProcessStub.spawn.getCall(0).args[0], 'dredd-hooks-php'

      it 'should pass --hookfiles option as a array of arguments', () ->
        loadWorkerClient()
        assert.equal childProcessStub.spawn.getCall(0).args[1][0], 'somefile.php'

      describe 'when the worker is not installed', () ->
        it 'should exit with 1', (done) ->
          hooks.processExit.reset()
          sinon.stub whichStub, 'which', (command) -> false
          loadWorkerClient()
          setTimeout () ->
            whichStub.which.restore()
            assert.isTrue hooks.processExit.calledWith(1)
            done()
          , 2200

        it 'should write a hint how to install', (done) ->
          sinon.stub consoleStub, 'log'
          sinon.stub whichStub, 'which', (command) -> false
          loadWorkerClient()
          setTimeout () ->
            logs = []
            for args in consoleStub.log.args
              logs.push args.join(" ")

            consoleStub.log.restore()
            whichStub.which.restore()

            assert.include logs.join(", "), "composer require ddelnano/dredd-hooks-php"
            done()
          , 2200

    describe 'when --language perl option is given', () ->
      beforeEach ->
        sinon.stub childProcessStub, 'spawn', () ->
          emitter = new EventEmitter
          emitter.stdout = new EventEmitter
          emitter.stderr = new EventEmitter
          emitter

        hooks['configuration'] =
          options:
            language: 'perl'
            hookfiles: "somefile.perl"

      afterEach ->
        childProcessStub.spawn.restore()
        hooks['configuration'] = undefined

      it 'should spawn the server process with command "dredd-hooks-perl"', () ->
        loadWorkerClient()
        assert.isTrue childProcessStub.spawn.called
        assert.equal childProcessStub.spawn.getCall(0).args[0], 'dredd-hooks-perl'

      it 'should pass --hookfiles option as a array of arguments', () ->
        loadWorkerClient()
        assert.equal childProcessStub.spawn.getCall(0).args[1][0], 'somefile.perl'

      describe 'when the worker is not installed', () ->
        it 'should exit with 1', (done) ->
          hooks.processExit.reset()
          sinon.stub whichStub, 'which', (command) -> false
          loadWorkerClient()
          setTimeout () ->
            whichStub.which.restore()
            assert.isTrue hooks.processExit.calledWith(1)
            done()
          , 2200

        it 'should write a hint how to install', (done) ->
          sinon.stub consoleStub, 'log'
          sinon.stub whichStub, 'which', (command) -> false
          loadWorkerClient()
          setTimeout () ->
            logs = []
            for args in consoleStub.log.args
              logs.push args.join(" ")

            consoleStub.log.restore()
            whichStub.which.restore()

            assert.include logs.join(", "), "cpanm Dredd::Hooks"
            done()
          , 2200


    describe 'when --language ./any/other-command is given', () ->
      beforeEach ->
        sinon.stub childProcessStub, 'spawn', () ->
          emitter = new EventEmitter
          emitter.stdout = new EventEmitter
          emitter.stderr = new EventEmitter
          emitter

        hooks['configuration'] =
          options:
            language: './my-fency-command'
            hookfiles: "somefile"

      afterEach ->
        childProcessStub.spawn.restore()
        hooks['configuration'] = undefined

      it 'should run this command given as language option', () ->
        loadWorkerClient()
        assert.isTrue childProcessStub.spawn.called
        assert.equal childProcessStub.spawn.getCall(0).args[0], './my-fency-command'

      it 'should pass --hookfiles option as a array of arguments', () ->
        loadWorkerClient()
        assert.equal childProcessStub.spawn.getCall(0).args[1][0], 'somefile'

    describe "after loading", () ->
      beforeEach (done) ->
        hooks.configuration =
          options:
            language: 'ruby'

        loadWorkerClient()
        setTimeout () ->
          done()
        , 2200

      eventTypes = [
        'beforeEach'
        'beforeEachValidation'
        'afterEach'
        'beforeAll'
        'afterAll'
      ]

      for eventType in eventTypes then do (eventType) ->
        it "should register hook function for hook type #{eventType}", () ->
          hookFuncs = hooks["#{eventType}Hooks"]
          assert.isAbove hookFuncs.length, 0

  describe 'when server is running', () ->
    server = null
    receivedData = null
    transaction = null
    connected = null
    currentSocket = null
    sentData = null

    beforeEach () ->
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


    it 'should connect to the server', (done) ->
      hooks.configuration.options.language = 'true'

      loadWorkerClient()
      setTimeout () ->
        assert.isTrue connected
        done()
      , 2200


    eventTypes = [
      'beforeEach'
      'beforeEachValidation'
      'afterEach'
      'beforeAll'
      'afterAll'
    ]

    for eventType in eventTypes then do (eventType) ->
      describe "when '#{eventType}' hook function is triggered", () ->

        if eventType.indexOf("All") > -1
          beforeEach (done) ->
            hooks.configuration.options.language = 'true'
            loadWorkerClient()
            sentData = clone [transaction]
            setTimeout () ->
              hooks["#{eventType}Hooks"][0] sentData, () ->
              done()
            , 2200
        else
          beforeEach (done) ->
            hooks.configuration.options.language = 'true'
            loadWorkerClient()
            sentData = clone transaction
            setTimeout () ->
              hooks["#{eventType}Hooks"][0] sentData, () ->
              done()
            , 2200


        it 'should send a json to the socket ending with delimiter character', (done) ->
          setTimeout () ->
            assert.include receivedData, "\n"
            assert.include receivedData, "{"
            done()
          , 200

        describe 'sent object', () ->
          receivedObject = null

          beforeEach ->
            receivedObject = JSON.parse receivedData.replace("\n","")

          keys = [
            'data'
            'event'
            'uuid'
          ]

          for key in keys then do (key) ->
            it "should contain key #{key}", () ->
              assert.property receivedObject, key

          it "key event should have value #{eventType}", () ->
            assert.equal receivedObject['event'], eventType

          if eventType.indexOf("All") > -1
            it "key data should contain array of transaction objects", () ->
              assert.isArray receivedObject['data']
              assert.propertyVal receivedObject['data'][0], 'key', 'value'
          else
            it "key data should contain the transaction object", () ->
              assert.isObject receivedObject['data']
              assert.propertyVal receivedObject['data'], 'key', 'value'

        if eventType.indexOf("All") > -1
          describe 'when server sends a response with matching uuid', () ->
            beforeEach () ->
              receivedObject = null
              receivedObject = JSON.parse clone(receivedData).replace("\n","")

              objectToSend = clone receivedObject
              # *all events are handling array of transactions
              objectToSend['data'][0]['key'] = "newValue"
              message = JSON.stringify(objectToSend) + "\n"
              currentSocket.write message

            it 'should add data from the response to the transaction', (done) ->
              setTimeout () ->
                assert.equal sentData[0]['key'], 'newValue'
                done()
              , 200
        else
          describe 'when server sends a response with matching uuid', () ->
            beforeEach () ->
              receivedObject = null
              receivedObject = JSON.parse clone(receivedData).replace("\n","")

              objectToSend = clone receivedObject
              objectToSend['data']['key'] = "newValue"

              message = JSON.stringify(objectToSend) + "\n"
              currentSocket.write message

            it 'should add data from the response to the transaction', (done) ->
              setTimeout () ->
                assert.equal sentData['key'], 'newValue'
                done()
              , 200
