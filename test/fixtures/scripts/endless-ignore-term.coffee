require('./handle-windows-sigint')()

ignore = ->
  console.log('ignoring termination')

process.on('SIGTERM', ignore)
process.on('SIGINT', ignore)

setInterval(( -> ), 1000)
