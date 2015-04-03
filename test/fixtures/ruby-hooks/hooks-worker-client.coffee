hooks = require 'hooks'
net = require 'net'
EventEmitter = require('events').EventEmitter
{exec} = require('child_process')

HOOK_TIMEOUT = 5000
WORKER_HOST = 'localhost'
WORKER_PORT = 61321
WORKER_MESSAGE_DELIMITER = "\n"
WORKER_COMMAND = 'ruby ./test/fixtures/ruby-hooks/dredd-worker.rb'

emitter = new EventEmitter

hooks.beforeEach = (hookFn) ->
  hooks.beforeAll (done) ->
    for transactionKey, transaction of hooks.transactions or {}
      hooks.beforeHooks[transaction.name] ?= []
      hooks.beforeHooks[transaction.name].unshift hookFn
    done()

hooks.afterEach = (hookFn) ->
  hooks.beforeAll (done) ->
    for transactionKey, transaction of hooks.transactions or {}
      hooks.afterHooks[transaction.name] ?= []
      hooks.afterHooks[transaction.name].unshift hookFn
    done()

worker = exec WORKER_COMMAND
console.log 'Spawning ruby worker'

worker.stdout.on 'data', (data) ->
  console.log data.toString()

worker.stderr.on 'data', (data) ->
  console.log data.toString()

worker.on 'error', (error) ->
  console.log error

workerClient = net.connect port: WORKER_PORT, host: WORKER_HOST, () ->
  # Do something when dredd starts
  # message =
  #   event: 'hooksInit'

  # worker.write JSON.stringify message
  # worker.write WORKER_MESSAGE_DELIMITER

workerClient.on 'error', () ->
  console.log 'Error connecting to the hook worker. Is the worker running?'
  process.exit()

workerBuffer = ""

workerClient.on 'data', (data) ->
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
    transaction: transaction

  workerClient.write JSON.stringify message
  workerClient.write WORKER_MESSAGE_DELIMITER

  # set timeout for the hook
  timeout = setTimeout () ->
    transaction.fail = 'Hook timed out.'
    callback()
  , HOOK_TIMEOUT

  # register event for the sent transaction
  emitter.on uuid, (receivedMessage) ->
    clearTimeout timeout
    # workaround forassigning transacition
    # this does not work:
    # transaction = receivedMessage.transaction
    for key, value of receivedMessage.transaction
      transaction[key] = value
    callback()

hooks.afterEach (transaction, callback) ->
  # avoiding dependency on external module here.
  uuid = Date.now().toString() + '-' + Math. random().toString(36).substring(7)

  # send transaction to the worker
  message =
    event: 'after'
    uuid: uuid
    transaction: transaction

  workerClient.write JSON.stringify message
  workerClient.write WORKER_MESSAGE_DELIMITER

  timeout = setTimeout () ->
    transaction.fail = 'Hook timed out.'
    callback()
  , HOOK_TIMEOUT

  emitter.on uuid, (receivedMessage) ->
    clearTimeout timeout
    # workaround forassigning transacition
    # this does not work:
    # transaction = receivedMessage.transaction
    for key, value of receivedMessage.transaction
      transaction[key] = value
    callback()

hooks.afterAll (callback) ->
  worker.kill 'SIGKILL'
  callback()