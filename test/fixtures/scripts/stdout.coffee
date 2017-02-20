process.on('SIGTERM', ->
  process.stdout.write('exiting\n')
  process.exit(0)
)

process.stdout.write('standard output text\n')
setInterval(( -> ), 100)
