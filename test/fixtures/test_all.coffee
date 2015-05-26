{after,afterAll,log} = require 'hooks'

after "Machines > Machines collection > Get Machines", (transaction) ->
  log "*** after"

afterAll (done) ->
  log "*** afterAll"
  done()
