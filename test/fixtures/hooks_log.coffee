{before, after, log} = require 'hooks'

before "Machines > Machines collection > Get Machines", (transaction) ->
  log 'error', {err: 'Error object!'}
  log 'info', true

after "Machines > Machines collection > Get Machines", (transaction) ->
  log "using hooks.log to debug"
