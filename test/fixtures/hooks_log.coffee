{before, after, log} = require 'hooks'

before "Machines > Machines collection > Get Machines", (transaction) ->
  log {err: 'Error object!'}
  log true

after "Machines > Machines collection > Get Machines", (transaction) ->
  log "using hooks.log to debug"
