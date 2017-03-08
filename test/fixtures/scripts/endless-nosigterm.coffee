process.on('SIGTERM', ->
  process.stdout.write('ignoring sigterm\n')
)

setInterval(( -> ), 1000)
