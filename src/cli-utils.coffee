cliUtils =
  exit: (code) ->
    process.exit code

  log: (line) ->
    console.log line

  error: (line) -> 
    console.error line

module.exports = cliUtils
