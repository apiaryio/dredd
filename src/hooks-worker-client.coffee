hooks = require 'hooks'
net = require 'net'
EventEmitter = require('events').EventEmitter
{spawn} = require('child_process')

HOOK_TIMEOUT = 5000
WORKER_HOST = 'localhost'
WORKER_PORT = 61321
WORKER_MESSAGE_DELIMITER = "\n"


emitter = new EventEmitter

language = hooks?.configuration?.options?.language


# Select worker based on option, use option string as command if not match anyting
if language == 'ruby'
  workerCommand = 'dredd-worker-ruby'
else if language = 'python'
  workerCommand = 'dredd-worker-python'
else if language = 'nodejs'
  throw new Error 'Hooks worker should not be used for nodejs. Use Dredds\' native node hooks instead'
else
  workerCommand = language

pathGlobs = [].concat hooks?.configuration?.options?.hookfiles

hooks.worker = spawn workerCommand, pathGlobs

console.log "Spawning `#{language}` hooks worker"

hooks.worker.stdout.on 'data', (data) ->
  console.log "Hook worker stdout:", data.toString()

hooks.worker.stderr.on 'data', (data) ->
  console.log "Hook worker stderr:", data.toString()

hooks.worker.on 'close', (status) ->
  console.log "Hook worker exited with status: #{status}"
  if status > 0
    process.exit status

hooks.worker.on 'error', (error) ->
  console.log error

# Wait before connecting to a worker
# Hack for blocking sleep, loading of hooks in dredd is not async
# TODO Move connecting to worker to async beforeAll hook
now = new Date().getTime()
while new Date().getTime() < now + 1000
  true

hooks.workerClient = net.connect port: WORKER_PORT, host: WORKER_HOST, () ->
  # Do something when dredd starts
  # message =
  #   event: 'hooksInit'

  # worker.write JSON.stringify message
  # worker.write WORKER_MESSAGE_DELIMITER

hooks.workerClient.on 'error', (error) ->
  console.log 'Error connecting to the hook worker. Is the worker running?'
  console.log error
  process.exit(1)

workerBuffer = ""

hooks.workerClient.on 'data', (data) ->
  process.stdout.write data.toString()
  workerBuffer += data.toString()
  if data.toString().indexOf(WORKER_MESSAGE_DELIMITER) > -1
    splittedData = workerBuffer.split(WORKER_MESSAGE_DELIMITER)

    # add last chunk to the buffer
    workerBuffer = splittedData.pop()

    messages = []
    for message in splittedData
      messages.push JSON.parse message

    for message in messages
      if message.uuid?
        emitter.emit message.uuid, message
      else
        console.log 'UUID not present in message: ', JSON.stringify(message, null ,2)

# Wait before starting a test
# Hack for blocking sleep, loading of hooks in dredd is not async
# TODO Move connecting to worker to async beforeAll hook
now = new Date().getTime()
while new Date().getTime() < now + 1000
  true

hooks.beforeEach (transaction, callback) ->
  # avoiding dependency on external module here.
  uuid = Date.now().toString() + '-' + Math. random().toString(36).substring(7)

  # send transaction to the worker
  message =
    event: 'before'
    uuid: uuid
    data: transaction

  hooks.workerClient.write JSON.stringify message
  hooks.workerClient.write WORKER_MESSAGE_DELIMITER

  # set timeout for the hook
  timeout = setTimeout () ->
    transaction.fail = 'Hook timed out.'
    callback()
  , HOOK_TIMEOUT

  # register event for the sent transaction
  emitter.on uuid, (receivedMessage) ->
    clearTimeout timeout
    # workaround for assigning transacition
    # this does not work:
    # transaction = receivedMessage.data
    for key, value of receivedMessage.data
      transaction[key] = value
    callback()

hooks.beforeEachValidation (transaction, callback) ->
  # avoiding dependency on external module here.
  uuid = Date.now().toString() + '-' + Math. random().toString(36).substring(7)

  # send transaction to the worker
  message =
    event: 'beforeValidation'
    uuid: uuid
    data: transaction

  hooks.workerClient.write JSON.stringify message
  hooks.workerClient.write WORKER_MESSAGE_DELIMITER

  # set timeout for the hook
  timeout = setTimeout () ->
    transaction.fail = 'Hook timed out.'
    callback()
  , HOOK_TIMEOUT

  # register event for the sent transaction
  emitter.on uuid, (receivedMessage) ->
    clearTimeout timeout
    # workaround for assigning transacition
    # this does not work:
    # transaction = receivedMessage.data
    for key, value of receivedMessage.data
      transaction[key] = value
    callback()


hooks.afterEach (transaction, callback) ->
  # avoiding dependency on external module here.
  uuid = Date.now().toString() + '-' + Math. random().toString(36).substring(7)

  # send transaction to the worker
  message =
    event: 'after'
    uuid: uuid
    data: transaction

  hooks.workerClient.write JSON.stringify message
  hooks.workerClient.write WORKER_MESSAGE_DELIMITER

  timeout = setTimeout () ->
    transaction.fail = 'Hook timed out.'
    callback()
  , HOOK_TIMEOUT

  emitter.on uuid, (receivedMessage) ->
    clearTimeout timeout
    # workaround for assigning transacition
    # this does not work:
    # transaction = receivedMessage.data
    for key, value of receivedMessage.data
      transaction[key] = value
    callback()

hooks.beforeAll (transactions, callback) ->
  # avoiding dependency on external module here.
  uuid = Date.now().toString() + '-' + Math. random().toString(36).substring(7)

  # send transaction to the worker
  message =
    event: 'beforeAll'
    uuid: uuid
    data: transactions

  hooks.workerClient.write JSON.stringify message
  hooks.workerClient.write WORKER_MESSAGE_DELIMITER

  timeout = setTimeout () ->
    console.log 'Hook timeouted.'
    callback()
  , HOOK_TIMEOUT

  emitter.on uuid, (receivedMessage) ->
    clearTimeout timeout

    # workaround for assigning transacitions
    # this does not work:
    # transactions = receivedMessage.data
    for value, index in receivedMessage.data
      transactions[index] = value
    callback()

hooks.afterAll (transactions, callback) ->
  # avoiding dependency on external module here.
  uuid = Date.now().toString() + '-' + Math. random().toString(36).substring(7)

  # send transaction to the worker
  message =
    event: 'afterAll'
    uuid: uuid
    data: transactions

  hooks.workerClient.write JSON.stringify message
  hooks.workerClient.write WORKER_MESSAGE_DELIMITER

  timeout = setTimeout () ->
    console.log 'Hook timeouted.'
    callback()
  , HOOK_TIMEOUT

  emitter.on uuid, (receivedMessage) ->
    clearTimeout timeout

    # workaround for assigning transacition
    # this does not work:
    # transactions = receivedMessage.data
    for value, index in receivedMessage.data
      transactions[index] = value
    callback()


hooks.afterAll (transactions, callback) ->
  hooks.worker.kill 'SIGKILL'

  # this is needed to for transaction modification integration tests
  # it can be refactored to expectations on received body in the express app in tests
  # in test/unit/transaction-runner-test.coffee > Command line interface > Using workaround for hooks in ruby

  if process.env['TEST_DREDD_WORKER'] == "true"
    console.log 'CHOP HERE'
    console.log JSON.stringify transactions[0]['hooks_modifications'], null, 2
    console.log 'CHOP HERE'
  callback()
