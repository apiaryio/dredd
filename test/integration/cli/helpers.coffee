
{exec} = require 'child_process'
clone = require 'clone'
express = require 'express'
{spawn} = require('cross-spawn')
syncExec = require 'sync-exec'
bodyParser = require 'body-parser'


DREDD_BIN = require.resolve('../../../bin/dredd')


execCommand = (command, args, options = {}, callback) ->
  [callback, options] = [options, undefined] if typeof options is 'function'

  stdout = ''
  stderr = ''

  cli = spawn(command, args, options)

  cli.stdout.on('data', (data) -> stdout += data)
  cli.stderr.on('data', (data) -> stderr += data)

  cli.on('close', (exitStatus) ->
    callback(null, {stdout, stderr, output: stdout + stderr, exitStatus})
  )


execDredd = (args, options, callback) ->
  execCommand('node', [DREDD_BIN].concat(args), options, callback)


startServer = (configure, port, callback) ->
  server =
    requested: false
    requests: {}
    requestCounts: {}

  app = express()
  app.use bodyParser.json {size: '5mb'}
  app.use (req, res, next) ->
    server.requested = true

    server.requests[req.url] ?= []
    server.requests[req.url].push
      method: req.method
      headers: clone req.headers
      body: clone req.body

    server.requestCounts[req.url] ?= 0
    server.requestCounts[req.url] += 1

    res.type 'json'
    next()
  configure app

  server.process = app.listen port, (err) ->
    callback err, server


isProcessRunning = (processName) ->
  {status} = syncExec "ps axu | grep test/fixtures/scripts/ | grep #{processName} | grep -v grep"
  status == 0


killAll = ->
  syncExec "ps aux | grep test/fixtures/scripts/ | grep -v grep | awk '{print $2}' | xargs kill -9"


module.exports = {
  DREDD_BIN
  execDredd
  startServer
  isProcessRunning
  killAll
}
