{assert} = require('chai')
{exec} = require('child_process')
express = require 'express'



PORT = '3333'

describe.only "Command line interface", () ->


  describe "Arguments with existing bleurpint and responding server", () ->    
    describe "when executing the command and the server is responding as specified in the blueprint", () ->
      stderr = ''
      stdout = ''
      exitStatus = null
      requests = []
      
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
          cli = exec cmd, (error, out, err) -> 
            cli = exec cmd, (error, out, err) -> 
            stdout = out
            stderr = err

            if error
              exitStatus = error.code
          
          eventName = if process.version.split('.')[1] is '6' then 'exit' else 'close'
          
          cli.on eventName, (code) ->
            exitStatus = code if exitStatus == null and code != undefined
            server.close()
        
        server.on 'close', done

      it 'exit status should be 0', () ->
        assert.equal exitStatus, 0
    
    describe "when executing the command and the server is sending different response", () ->
      stderr = ''
      stdout = ''
      exitStatus = null
      requests = []

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
          cli = exec cmd, (error, out, err) -> 
            cli = exec cmd, (error, out, err) -> 
            stdout = out
            stderr = err

            if error
              exitStatus = error.code
          
          eventName = if process.version.split('.')[1] is '6' then 'exit' else 'close'
          
          cli.on eventName, (code) -> 
            exitStatus = code if exitStatus == null and code != undefined        
            server.close()
        
        server.on 'close', done

      it 'exit status should be 1', () ->
        assert.equal exitStatus, 1
