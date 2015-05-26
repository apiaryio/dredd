{afterAll,log} = require 'hooks'

afterAll (done) ->
  log "hooks.afterAll"
  done()
