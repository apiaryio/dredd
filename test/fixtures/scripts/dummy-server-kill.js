
express = require 'express'
app = express()


app.get '/machines', (req, res) ->
  res.json [{type: 'bulldozer', name: 'willy'}]

app.get '/machines/:name', (req, res) ->
  process.kill process.pid, 'SIGKILL'


app.listen process.argv[2], ->
  console.log "Dummy server listening on port #{process.argv[2]}!"
