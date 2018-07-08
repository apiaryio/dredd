require('./handle-windows-sigint.js')()

exit = ->
  process.stdout.write('exiting\n')
  process.exit(0)

process.on('SIGTERM', exit)
process.on('SIGINT', exit)

process.stdout.write('standard output text\n')
setInterval(( -> ), 100)
