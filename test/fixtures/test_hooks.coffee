{after,log} = require 'hooks'

after "Machines > Machines collection > Get Machines", (transaction) ->
  log "after"
