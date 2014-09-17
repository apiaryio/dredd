{afterAll} = require 'hooks'

afterAll (done) ->
  console.log "afterAll"
  done()
