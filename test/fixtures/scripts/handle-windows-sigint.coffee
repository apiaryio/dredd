readline = require('readline')

ASCII_CTRL_C = 3

# To learn about why this is needed and how it works, see
# the 'src/child-process.coffee' file, function 'signalTerm'.
module.exports = ->
  # Handling programmatic interruption (Dredd sends '\u0003'
  # to stdin)
  process.stdin.on('data', (chunk) ->
    for char in chunk.toString()
      if char.charCodeAt(0) is ASCII_CTRL_C
        process.emit('SIGINT')
        break
  )

  # Handling manual interruption (user sends '\u0003' to stdin by
  # manually pressing Ctrl+C)
  rl = readline.createInterface(
    input: process.stdin
    output: process.stdout
  )
  rl.on('SIGINT', ->
    process.emit('SIGINT')
  )
