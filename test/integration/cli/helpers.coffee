
{exec} = require 'child_process'
clone = require 'clone'
express = require 'express'
bodyParser = require 'body-parser'


DREDD_BIN = './bin/dredd'


execCommand = (cmd, options = {}, callback) ->
  [callback, options] = [options, undefined] if typeof options is 'function'

  stderr = ''
  stdout = ''
  exitStatus = null

  cli = exec cmd, options, (error, out, err) ->
    stdout = out
    stderr = err
    exitStatus = error.code if error

  cli.on 'close', (code) ->
    exitStatus = code if exitStatus == null and code != undefined
    callback null, {stdout, stderr, output: stdout + stderr, exitStatus}


execDredd = (args, options, callback) ->
  execCommand "#{DREDD_BIN} #{args.join(' ')}", options, callback


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


module.exports = {
  execDredd
  startServer
}
