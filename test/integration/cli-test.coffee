{assert} = require('chai')
{exec} = require('child_process')
express = require 'express'



PORT = '3333'
CMD_PREFIX = ''

stderr = ''
stdout = ''
exitStatus = null
requests = []

execCommand = (cmd, callback) ->
  stderr = ''
  stdout = ''
  exitStatus = null

  cli = exec CMD_PREFIX + cmd, (error, out, err) -> 
    stdout = out
    stderr = err

    if error
      exitStatus = error.code

  exitEventName = if process.version.split('.')[1] is '6' then 'exit' else 'close'
  
  cli.on exitEventName, (code) -> 
    exitStatus = code if exitStatus == null and code != undefined
    callback()
  

describe "Command line interface", () ->

  describe "When blueprint file not found", (done) ->
    before (done) ->
      cmd = "./bin/dredd ./test/fixtures/nonexistent_path.md http://localhost:#{PORT}"
      
      execCommand cmd, done
      
    it 'should exit with status 1', () ->
      assert.equal exitStatus, 1

    it 'should print error message to stderr', () ->
      assert.include stderr, 'Error: ENOENT, open'

  describe "Arguments with existing bleurpint and responding server", () ->    
    describe "when executing the command and the server is responding as specified in the blueprint", () ->
    
      before (done) ->
        cmd = "./bin/dredd ./test/fixtures/single_get.md http://localhost:#{PORT}"
        
        app = express()
        
        app.get '/machines', (req, res) -> 
          res.setHeader 'Content-Type', 'application/json'          
          machine =
            type: 'bulldozer'
            name: 'willy'
          response = [machine]
          res.send 200, response
        
        server = app.listen PORT, () ->          
          execCommand cmd, () ->
            server.close()
        
        server.on 'close', done

      it 'exit status should be 0', () ->
        assert.equal exitStatus, 0
    
    describe "when executing the command and the server is sending different response", () ->
      before (done) ->
        cmd = "./bin/dredd ./test/fixtures/single_get.md http://localhost:#{PORT}"
        
        app = express()
        
        app.get '/machines', (req, res) -> 
          res.setHeader 'Content-Type', 'application/json'          
          machine =
            kind: 'bulldozer'
            imatriculation: 'willy'
          response = [machine]
          res.send 201, response
        
        server = app.listen PORT, () ->
          execCommand cmd, () ->
            server.close()
        
        server.on 'close', done

      it 'exit status should be 1', () ->
        assert.equal exitStatus, 1
