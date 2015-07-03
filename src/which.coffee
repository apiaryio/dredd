childProcess = require 'child_process'

module.exports =
  which: (command) ->
    childProcess.spawnSync("which", [command]).status == 0