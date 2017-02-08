clone = require('clone')
express = require('express')
{spawn} = require('cross-spawn')
bodyParser = require('body-parser')

logger = require('../../src/logger')


DEFAULT_SERVER_PORT = 9876
DREDD_BIN = require.resolve('../../bin/dredd')


# Runs CLI command with given arguments. Records and provides stdout, stderr
# and also 'output', which is the two combined. Also provides 'exitStatus'
# of the process.
runCommand = (command, args, spawnOptions = {}, callback) ->
  [callback, spawnOptions] = [spawnOptions, undefined] if typeof spawnOptions is 'function'

  stdout = ''
  stderr = ''

  cli = spawn(command, args, spawnOptions)

  cli.stdout.on('data', (data) -> stdout += data)
  cli.stderr.on('data', (data) -> stderr += data)

  cli.on('close', (exitStatus) ->
    callback(null, {stdout, stderr, output: stdout + stderr, exitStatus})
  )


# Runs Dredd as a CLI command, with given arguments.
runDreddCommand = (args, spawnOptions, callback) ->
  runCommand('node', [DREDD_BIN].concat(args), spawnOptions, callback)


# Creates a new Express.js instance. Automatically records everything about
# requests which the server has recieved during runtime. Sets JSON body parser
# and 'application/json' as default value for the Content-Type header. In
# callback of the listen() function it additionally provides server runtime
# information (useful for inspecting in tests):
#
# - process (object) - the server process object (has the .close() method)
# - requested (boolean) - whether the server recieved at least one request
# - requests (object) - recorded requests
#     - *endpointUrl* (array)
#         - (object)
#             - method: GET (string)
#             - headers (object)
#             - body (string)
# - requestCounts (object)
#     - *endpointUrl*: 0 (number, default) - number of requests to the endpoint
createServer = ->
  app = express()

  serverRuntimeInfo =
    requested: false
    requests: {}
    requestCounts: {}

  app.use(bodyParser.json({size: '5mb'}))
  app.use((req, res, next) ->
    serverRuntimeInfo.requested = true

    serverRuntimeInfo.requests[req.url] ?= []
    serverRuntimeInfo.requests[req.url].push(
      method: req.method
      headers: clone(req.headers)
      body: clone(req.body)
    )

    serverRuntimeInfo.requestCounts[req.url] ?= 0
    serverRuntimeInfo.requestCounts[req.url] += 1

    res.type('json')
    next()
  )

  # Monkey-patching the app.listen() function. The 'port' argument
  # is made optional, defaulting to the 'DEFAULT_SERVER_PORT' value.
  # The callback is provided not only with error object, but also with
  # runtime info about the server (what requests it got etc.).
  listen = app.listen
  app.listen = (port, callback) ->
    [callback, port] = [port, DEFAULT_SERVER_PORT] if typeof port is 'function'
    listen.call(@, port, (err) ->
      callback(err, serverRuntimeInfo)
    )
  return app


# Runs given Dredd class instance against localhost server on given (or default)
# server port. Automatically records all Dredd logging ouput. The error isn't passed
# as the first argument, but as part of the result, which is convenient in
# tests. Except of 'err' and 'logging' returns also 'stats' which is what the Dredd
# instance returns as test results.
runDredd = (dredd, serverPort, callback) ->
  [callback, serverPort] = [serverPort, DEFAULT_SERVER_PORT] if typeof serverPort is 'function'
  dredd.configuration.server ?= "http://127.0.0.1:#{serverPort}"
  dredd.configuration.options ?= {}
  dredd.configuration.options.level ?= 'silly'

  silent = !!logger.transports.console.silent
  logger.transports.console.silent = true # supress Dredd's console output (remove if debugging)

  err = undefined
  stats = undefined
  logging = ''

  recordLogging = (transport, level, message, meta) ->
    logging += "#{level}: #{message}\n"

  logger.on('logging', recordLogging)
  dredd.run((args...) ->
    logger.removeListener('logging', recordLogging)
    logger.transports.console.silent = silent

    [err, stats] = args
    callback(null, {err, stats, logging})
  )


# Runs given Express.js server instance and then runs given Dredd class instance.
# Collects their runtime information and provides it to the callback.
runDreddWithServer = (dredd, app, serverPort, callback) ->
  [callback, serverPort] = [serverPort, DEFAULT_SERVER_PORT] if typeof serverPort is 'function'

  server = app.listen(serverPort, (err, serverRuntimeInfo) ->
    return callback(err) if err

    runDredd(dredd, serverPort, (err, dreddRuntimeInfo) ->
      server.close( ->
        callback(err, {server: serverRuntimeInfo, dredd: dreddRuntimeInfo})
      )
    )
  )


module.exports = {
  DEFAULT_SERVER_PORT
  runDreddCommand
  createServer
  runDredd
  runDreddWithServer
}
