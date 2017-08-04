clone = require('clone')
https = require('https')
async = require('async')
fs = require('fs')
path = require('path')
express = require('express')
spawn = require('cross-spawn')
bodyParser = require('body-parser')
ps = require('ps-node')

logger = require('../../src/logger')


DEFAULT_SERVER_PORT = 9876
DREDD_BIN = require.resolve('../../bin/dredd')


# Records logging during runtime of a given function. Given function
# is provided with a 'next' callback. The final callback is provided
# with:
#
# - err (Error) - in case the recordLogging function failed (never)
# - args (array) - array of all arguments the 'next' callback obtained
#                  from the 'fn' function
# - logging (string) - the recorded logging output
recordLogging = (fn, callback) ->
  silent = !!logger.transports.console.silent
  logger.transports.console.silent = true # supress Dredd's console output (remove if debugging)

  logging = ''
  record = (transport, level, message, meta) ->
    logging += "#{level}: #{message}\n"

  logger.on('logging', record)
  fn((args...) ->
    logger.removeListener('logging', record)
    logger.transports.console.silent = silent
    callback(null, args, logging)
  )


# Helper function which records incoming server request to given
# server runtime info object.
recordServerRequest = (serverRuntimeInfo, req) ->
  # Initial values before any request is made:
  # - requestedOnce = false
  # - requested = false
  serverRuntimeInfo.requestedOnce = not serverRuntimeInfo.requested
  serverRuntimeInfo.requested = true

  recordedReq =
    method: req.method
    url: req.url
    headers: clone(req.headers)
    body: clone(req.body)

  serverRuntimeInfo.lastRequest = recordedReq

  serverRuntimeInfo.requests[req.url] ?= []
  serverRuntimeInfo.requests[req.url].push(recordedReq)

  serverRuntimeInfo.requestCounts[req.url] ?= 0
  serverRuntimeInfo.requestCounts[req.url] += 1


# Helper to get SSL credentials. Uses dummy self-signed certificate.
getSSLCredentials = ->
  httpsDir = path.join(__dirname, '../fixtures/https')
  {
    key: fs.readFileSync(path.join(httpsDir, 'server.key'), 'utf8')
    cert: fs.readFileSync(path.join(httpsDir, 'server.crt'), 'utf8')
  }


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
createServer = (options = {}) ->
  protocol = options.protocol or 'http'
  bodyParserInstance = options.bodyParser or bodyParser.json({size: '5mb'})

  serverRuntimeInfo =
    requestedOnce: false
    requested: false
    lastRequest: null
    requests: {}
    requestCounts: {}

  app = express()
  app.use(bodyParserInstance)
  app.use((req, res, next) ->
    recordServerRequest(serverRuntimeInfo, req)
    res.type('json')
    res.status(200) # sensible defaults, can be overriden
    next()
  )
  app = https.createServer(getSSLCredentials(), app) if protocol is 'https'

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

  err = undefined
  stats = undefined

  recordLogging((next) ->
    dredd.run(next)
  , (err, args, logging) ->
    return callback(err) if err

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


# Runs CLI command with given arguments. Records and provides stdout, stderr
# and also 'output', which is the two combined. Also provides 'exitStatus'
# of the process.
runCommand = (command, args, spawnOptions = {}, callback) ->
  [callback, spawnOptions] = [spawnOptions, undefined] if typeof spawnOptions is 'function'

  stdout = ''
  stderr = ''
  output = ''

  cli = spawn(command, args, spawnOptions)

  cli.stdout.on('data', (data) ->
    stdout += data
    output += data
  )
  cli.stderr.on('data', (data) ->
    stderr += data
    output += data
  )

  cli.on('exit', (exitStatus) ->
    callback(null, {stdout, stderr, output, exitStatus})
  )


# Runs Dredd as a CLI command, with given arguments.
runDreddCommand = (args, spawnOptions, callback) ->
  runCommand('node', [DREDD_BIN].concat(args), spawnOptions, callback)


# Runs given Express.js server instance and then runs Dredd command with given
# arguments. Collects their runtime information and provides it to the callback.
runDreddCommandWithServer = (args, app, serverPort, callback) ->
  [callback, serverPort] = [serverPort, DEFAULT_SERVER_PORT] if typeof serverPort is 'function'

  server = app.listen(serverPort, (err, serverRuntimeInfo) ->
    return callback(err) if err

    runDreddCommand(args, (err, dreddCommandInfo) ->
      server.close( ->
        callback(err, {server: serverRuntimeInfo, dredd: dreddCommandInfo})
      )
    )
  )


# Checks whether there's a process with name matching given pattern.
isProcessRunning = (pattern, callback) ->
  ps.lookup({arguments: pattern}, (err, processList) ->
    callback(err, !!processList?.length)
  )


# Kills process with given PID if the process exists. Otherwise
# does nothing.
kill = (pid, callback) ->
  if process.platform is 'win32'
    taskkill = spawn('taskkill', ['/F', '/T', '/PID', pid])
    taskkill.on('exit', -> callback())
    # no error handling - we don't care about the result of the command
  else
    try
      process.kill(pid, 'SIGKILL')
    catch
      # if the PID doesn't exist, process.kill() throws - we do not care
    process.nextTick(callback)


# Kills processes which have names matching given pattern. Does
# nothing if there are no matching processes.
killAll = (pattern, callback) ->
  ps.lookup({arguments: pattern}, (err, processList) ->
    return callback(err) if err or not processList.length

    async.each(processList, (processListItem, next) ->
      kill(processListItem.pid, next)
    , callback)
  )


module.exports = {
  DEFAULT_SERVER_PORT
  recordLogging
  createServer
  runDredd
  runDreddWithServer
  runDreddCommand
  runDreddCommandWithServer
  isProcessRunning
  kill
  killAll
}
