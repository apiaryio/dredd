process.on('SIGTERM', ->
  process.stdout.write('exiting\n')
  process.exit(0)
)

process.stderr.write('error output text\n')
setInterval(( -> ), 100)
