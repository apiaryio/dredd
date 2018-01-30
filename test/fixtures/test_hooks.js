{after} = require 'hooks'

after "Machines > Machines collection > Get Machines", (transaction) ->
  console.log "after"
