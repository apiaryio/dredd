{afterAll} = require 'dredd-events'

afterAll (done) ->
  console.log "afterAll"
  done()
