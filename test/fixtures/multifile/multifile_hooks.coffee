{after} = require 'hooks'

after "Name API > /name > GET", (transaction) ->
  console.log "after name"

after "Greeting API > /greeting > GET", (transaction) ->
  console.log "after greeting"

after "Message API > /message > GET", (transaction) ->
  console.log "after message"
