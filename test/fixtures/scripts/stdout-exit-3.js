require('./handle-windows-sigint')()


exit = ->
  process.stdout.write('exiting\n')
  process.exit(3)

process.on('SIGTERM', exit)
process.on('SIGINT', exit)


process.stdout.write('standard output text\n')
setInterval(( -> ), 100)
