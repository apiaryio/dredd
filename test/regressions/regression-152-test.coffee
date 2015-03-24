{assert} = require('chai')
{exec} = require('child_process')
express = require 'express'
clone = require 'clone'
bodyParser = require 'body-parser'
fs = require 'fs'
path = require 'path'

PORT = 9998

stderr = ''
stdout = ''
exitStatus = null
requests = []

execCommand = (cmd, options = {}, callback) ->
  stderr = ''
  stdout = ''
  exitStatus = null

  if typeof options is 'function'
    callback = options
    options = undefined

  cli = exec "node #{cmd}", options, (error, out, err) ->
    stdout = out
    stderr = err

    if error
      exitStatus = error.code

  cli.on 'close', (code) ->
    exitStatus = code if exitStatus == null and code != undefined
    if cli.stdout?._pendingWriteReqs or cli.stderr?._pendingWriteReqs
      process.nextTick ->
        exitStatus = code if exitStatus == null and code != undefined
        callback(undefined, stdout, stderr, exitStatus)
    else
      callback(undefined, stdout, stderr, exitStatus)


describe "Regressions", () ->

  describe 'issue 152 - modify transaction object inside beforeAll combined with beforeEach helper', () ->

    receivedRequest = {}

    before (done) ->
      cmd = "bin/dredd ./test/fixtures/single-get.apib http://localhost:#{PORT} --hookfiles=./test/fixtures/regression-152.coffee"

      app = express()

      app.get '/machines', (req, res) ->
        receivedRequest = req
        res.setHeader 'Content-Type', 'application/json'
        machine =
          type: 'bulldozer'
          name: 'willy'
        response = [machine]
        res.status(200).send response

      server = app.listen PORT, () ->
        execCommand cmd, () ->
          server.close()

      server.on 'close', done

    it 'should modify the transaction with hooks', () ->
      assert.include receivedRequest.url, 'api-key=23456'
