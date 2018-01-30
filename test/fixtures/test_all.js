{after,afterAll} = require 'hooks'

after "Machines > Machines collection > Get Machines", (transaction) ->
  console.log "*** after"

afterAll (done) ->
  console.log "*** afterAll"
  done()
