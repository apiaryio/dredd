require('./handle-windows-sigint')()

exit = ->
  process.stdout.write('exiting\n')
  process.exit(0)

process.on('SIGTERM', exit)
process.on('SIGINT', exit)

process.stderr.write('error output text\n')
setInterval(( -> ), 100)
