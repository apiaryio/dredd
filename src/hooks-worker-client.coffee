hooks = require 'hooks'
net = require 'net'
EventEmitter = require('events').EventEmitter

child_process = require('child_process')
spawn = child_process.spawn

# for stubbing in tests
console = require 'console'

which = require './which'

HOOK_TIMEOUT = 5000
HANDLER_HOST = 'localhost'
HANDLER_PORT = 61321
HANDLER_MESSAGE_DELIMITER = "\n"


emitter = new EventEmitter

language = hooks?.configuration?.options?.language

# Select handler based on option, use option string as command if not match anything
if language == 'ruby'
  handlerCommand = 'dredd-hooks-ruby'
  unless which.which handlerCommand
    console.log "Ruby hooks handler server command not found: #{handlerCommand}"
    console.log "Install ruby hooks handler by running:"
    console.log "$ gem install dredd_hooks"
    hooks.processExit 1

else if language == 'python'
  handlerCommand = 'dredd-hooks-python'
  unless which.which handlerCommand
    console.log "Python hooks handler server command not found: #{handlerCommand}"
    console.log "Install python hooks handler by running:"
    console.log "$ pip install dredd_hooks"
    hooks.processExit 1

else if language == 'php'
  handlerCommand = 'dredd-hooks-php'
  unless which.which handlerCommand
    console.log "PHP hooks handler server command not found: #{handlerCommand}"
    console.log "Install php hooks handler by running:"
    console.log "$ composer require ddelnano/dredd-hooks-php --dev"
    hooks.processExit 1

else if language == 'perl'
  handlerCommand = 'dredd-hooks-perl'
  unless which.which handlerCommand
    console.log "Perl hooks handler server command not found: #{handlerCommand}"
    console.log "Install perl hooks handler by running:"
    console.log "$ cpanm Dredd::Hooks"
    hooks.processExit 1

else if language == 'nodejs'
  throw new Error 'Hooks handler should not be used for nodejs. Use Dredds\' native node hooks instead'
else
  handlerCommand = language
  unless which.which handlerCommand
    console.log "Hooks handler server command not found: #{handlerCommand}"
    hooks.processExit 1



pathGlobs = [].concat hooks?.configuration?.options?.hookfiles

handler = spawn handlerCommand, pathGlobs

console.log "Spawning `#{language}` hooks handler"

handler.stdout.on 'data', (data) ->
  console.log "Hook handler stdout:", data.toString()

handler.stderr.on 'data', (data) ->
  console.log "Hook handler stderr:", data.toString()

handler.on 'close', (status) ->
  console.log "Hook handler closed with status: #{status}"
  if status? and status != 0
    hooks.processExit 2

handler.on 'error', (error) ->
  console.log error

# Wait before connecting to a handler
# Hack for blocking sleep, loading of hooks in dredd is not async
# TODO Move connecting to handler to async beforeAll hook
now = new Date().getTime()
while new Date().getTime() < now + 1000
  true

handlerClient = net.connect port: HANDLER_PORT, host: HANDLER_HOST, () ->
  # Do something when dredd starts
  # message =
  #   event: 'hooksInit'

  # handler.write JSON.stringify message
  # handler.write HANDLER_MESSAGE_DELIMITER

handlerClient.on 'error', (error) ->
  console.log 'Error connecting to the hook handler. Is the handler running?'
  console.log error
  hooks.processExit(3)

handlerBuffer = ""

handlerClient.on 'data', (data) ->
  handlerBuffer += data.toString()
  if data.toString().indexOf(HANDLER_MESSAGE_DELIMITER) > -1
    splittedData = handlerBuffer.split(HANDLER_MESSAGE_DELIMITER)

    # add last chunk to the buffer
    handlerBuffer = splittedData.pop()

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
# TODO Move connecting to handler to async beforeAll hook
now = new Date().getTime()
while new Date().getTime() < now + 1000
  true

hooks.beforeEach (transaction, callback) ->
  # avoiding dependency on external module here.
  uuid = Date.now().toString() + '-' + Math. random().toString(36).substring(7)

  # send transaction to the handler
  message =
    event: 'beforeEach'
    uuid: uuid
    data: transaction

  handlerClient.write JSON.stringify message
  handlerClient.write HANDLER_MESSAGE_DELIMITER

  # register event for the sent transaction
  messageHandler = (receivedMessage) ->
    clearTimeout timeout
    # workaround for assigning transaction
    # this does not work:
    # transaction = receivedMessage.data
    for key, value of receivedMessage.data
      transaction[key] = value
    callback()

  handleTimeout = () ->
    transaction.fail = 'Hook timed out.'
    emitter.removeListener uuid, messageHandler
    callback()

  # set timeout for the hook
  timeout = setTimeout handleTimeout, HOOK_TIMEOUT

  emitter.on uuid, messageHandler

hooks.beforeEachValidation (transaction, callback) ->
  # avoiding dependency on external module here.
  uuid = Date.now().toString() + '-' + Math. random().toString(36).substring(7)

  # send transaction to the handler
  message =
    event: 'beforeEachValidation'
    uuid: uuid
    data: transaction

  handlerClient.write JSON.stringify message
  handlerClient.write HANDLER_MESSAGE_DELIMITER

  # register event for the sent transaction
  messageHandler = (receivedMessage) ->
    clearTimeout timeout
    # workaround for assigning transaction
    # this does not work:
    # transaction = receivedMessage.data
    for key, value of receivedMessage.data
      transaction[key] = value
    callback()

  handleTimeout = () ->
    transaction.fail = 'Hook timed out.'
    emitter.removeListener uuid, messageHandler
    callback()

  # set timeout for the hook
  timeout = setTimeout handleTimeout, HOOK_TIMEOUT

  emitter.on uuid, messageHandler


hooks.afterEach (transaction, callback) ->
  # avoiding dependency on external module here.
  uuid = Date.now().toString() + '-' + Math. random().toString(36).substring(7)

  # send transaction to the handler
  message =
    event: 'afterEach'
    uuid: uuid
    data: transaction

  handlerClient.write JSON.stringify message
  handlerClient.write HANDLER_MESSAGE_DELIMITER

  # register event for the sent transaction
  messageHandler = (receivedMessage) ->
    clearTimeout timeout
    # workaround for assigning transaction
    # this does not work:
    # transaction = receivedMessage.data
    for key, value of receivedMessage.data
      transaction[key] = value
    callback()

  handleTimeout = () ->
    transaction.fail = 'Hook timed out.'
    emitter.removeListener uuid, messageHandler
    callback()

  # set timeout for the hook
  timeout = setTimeout handleTimeout, HOOK_TIMEOUT

  emitter.on uuid, messageHandler

hooks.beforeAll (transactions, callback) ->
  # avoiding dependency on external module here.
  uuid = Date.now().toString() + '-' + Math. random().toString(36).substring(7)

  # send transaction to the handler
  message =
    event: 'beforeAll'
    uuid: uuid
    data: transactions

  handlerClient.write JSON.stringify message
  handlerClient.write HANDLER_MESSAGE_DELIMITER

  # register event for the sent transaction
  messageHandler = (receivedMessage) ->
    clearTimeout timeout
    # workaround for assigning transaction
    # this does not work:
    # transaction = receivedMessage.data
    for value, index in receivedMessage.data
      transactions[index] = value
    callback()

  handleTimeout = () ->
    console.log 'Hook timed out.'
    emitter.removeListener uuid, messageHandler
    callback()

  # set timeout for the hook
  timeout = setTimeout handleTimeout, HOOK_TIMEOUT

  emitter.on uuid, messageHandler

hooks.afterAll (transactions, callback) ->
  # avoiding dependency on external module here.
  uuid = Date.now().toString() + '-' + Math. random().toString(36).substring(7)

  # send transaction to the handler
  message =
    event: 'afterAll'
    uuid: uuid
    data: transactions

  handlerClient.write JSON.stringify message
  handlerClient.write HANDLER_MESSAGE_DELIMITER

  # register event for the sent transaction
  messageHandler = (receivedMessage) ->
    clearTimeout timeout
    # workaround for assigning transaction
    # this does not work:
    # transaction = receivedMessage.data
    for value, index in receivedMessage.data
      transactions[index] = value
    callback()

  handleTimeout = () ->
    console.log 'Hook timed out.'
    emitter.removeListener uuid, messageHandler
    callback()

  # set timeout for the hook
  timeout = setTimeout handleTimeout, HOOK_TIMEOUT

  emitter.on uuid, messageHandler


hooks.afterAll (transactions, callback) ->

  # Kill the handler server
  handler.kill 'SIGKILL'

  # This is needed to for transaction modification integration tests.
  if process.env['TEST_DREDD_HOOKS_HANDLER_ORDER'] == "true"
    console.log 'FOR TESTING ONLY'
    for mod, index in transactions[0]['hooks_modifications']
      console.log "#{index} #{mod}"
    console.log 'FOR TESTING ONLY'
  callback()
