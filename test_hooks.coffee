hooks = require 'hooks'

hooks.before "Authentication > Users Collection > Create a User", (transaction) ->
  transaction.request.headers["Test Header"] = "123232323"
  console.log "before"

hooks.after "Authentication > Users Collection > Create a User", (transaction) ->
  console.log "after"
