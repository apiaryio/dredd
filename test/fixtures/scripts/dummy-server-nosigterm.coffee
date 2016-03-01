
express = require 'express'
app = express()


process.on 'SIGTERM', ->
  console.log 'ignoring sigterm'


app.get '/machines', (req, res) ->
  res.send [{type: 'bulldozer', name: 'willy'}]

app.get '/machines/:name', (req, res) ->
  res.send {type: 'bulldozer', name: req.params.name}


app.listen process.argv[2], ->
  console.log "Dummy server listening on port #{process.argv[2]}!"
