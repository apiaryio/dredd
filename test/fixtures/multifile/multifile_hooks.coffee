{after, log} = require 'hooks'

after "Name API > /name > GET", (transaction) ->
  log "after name"

after "Greeting API > /greeting > GET", (transaction) ->
  log "after greeting"

after "Message API > /message > GET", (transaction) ->
  log "after message"
