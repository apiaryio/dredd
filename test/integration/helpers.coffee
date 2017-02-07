clone = require('clone')
express = require('express')
{spawn} = require('cross-spawn')
bodyParser = require('body-parser')

logger = require('../../src/logger')


DEFAULT_SERVER_PORT = 9876
DREDD_BIN = require.resolve('../../bin/dredd')


runCommand = (command, args, options = {}, callback) ->
  [callback, options] = [options, undefined] if typeof options is 'function'

  stdout = ''
  stderr = ''

  cli = spawn(command, args, options)

  cli.stdout.on('data', (data) -> stdout += data)
  cli.stderr.on('data', (data) -> stderr += data)

  cli.on('close', (exitStatus) ->
    callback(null, {stdout, stderr, output: stdout + stderr, exitStatus})
  )


runDreddCommand = (args, options, callback) ->
  runCommand('node', [DREDD_BIN].concat(args), options, callback)


startServer = (configure, port, callback) ->
  server =
    requested: false
    requests: {}
    requestCounts: {}

  app = express()
  app.use(bodyParser.json({size: '5mb'}))
  app.use((req, res, next) ->
    server.requested = true

    server.requests[req.url] ?= []
    server.requests[req.url].push(
      method: req.method
      headers: clone(req.headers)
      body: clone(req.body)
    )

    server.requestCounts[req.url] ?= 0
    server.requestCounts[req.url] += 1

    res.type('json')
    next()
  )
  configure(app)

  server.process = app.listen(port, (err) ->
    callback(err, server)
  )


runDredd = (dredd, cb) ->
  dredd.configuration.server ?= "http://127.0.0.1:#{DEFAULT_SERVER_PORT}"

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
    cb(null, {err, stats, logging})
  )


runDreddWithServer = (dredd, app, port, cb) ->
  [cb, port] = [port, DEFAULT_SERVER_PORT] if typeof port is 'function'
  dredd.configuration.server ?= "http://127.0.0.1:#{port}"

  server = app.listen(port, (err) ->
    return cb(err) if err

    runDredd(dredd, (err, results) ->
      server.close( -> cb(err, results))
    )
  )


module.exports = {
  DEFAULT_SERVER_PORT
  runDredd
  runDreddWithServer
  runDreddCommand
  startServer
}
