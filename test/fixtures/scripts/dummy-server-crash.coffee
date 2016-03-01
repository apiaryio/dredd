
express = require 'express'
app = express()


app.get '/machines', (req, res) ->
  res.send [{type: 'bulldozer', name: 'willy'}]

app.get '/machines/:name', (req, res) ->
  process.exit 1


app.listen process.argv[2], ->
  console.log "Dummy server listening on port #{process.argv[2]}!"
